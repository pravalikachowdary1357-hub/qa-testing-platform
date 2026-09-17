import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type {
  ImportResult,
  ImportRowError,
} from '../common/import/import-result.interface';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };
const PROJECT_REF_SELECT = { select: { id: true, name: true } };
const PRODUCT_OWNER_SELECT = { select: { id: true, name: true, email: true } };
const PRODUCT_INCLUDE = {
  organization: ORGANIZATION_REF_SELECT,
  project: PROJECT_REF_SELECT,
  productOwner: PRODUCT_OWNER_SELECT,
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.product.findMany({
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto, actor?: AuthenticatedUser) {
    let created;
    try {
      created = await this.prisma.product.create({
        data: dto,
        include: PRODUCT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException(
            `Organization or project not found for this product`,
          );
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Product key "${dto.productKey}" is already used by another product in this organization.`,
          );
        }
      }
      throw error;
    }

    if (actor) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'create',
        entityType: 'Product',
        entityId: created.id,
        summary: `Created product "${created.name}"`,
      });
    }
    return created;
  }

  async update(id: string, dto: UpdateProductDto, actor?: AuthenticatedUser) {
    let updated;
    try {
      updated = await this.prisma.product.update({
        where: { id },
        data: dto,
        include: PRODUCT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Product ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            `Organization or project not found for this product`,
          );
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Product key "${dto.productKey}" is already used by another product in this organization.`,
          );
        }
      }
      throw error;
    }

    if (actor) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'update',
        entityType: 'Product',
        entityId: updated.id,
        summary: `Updated product "${updated.name}"`,
      });
    }
    return updated;
  }

  // Powers the Dashboard once it's scoped to a single product: everything
  // here is a live count derived from real rows (never a manually-entered
  // field), which is exactly what's missing from Product's own
  // testCoverage/passRate/openDefects/releaseReadiness -- those stay
  // sourced straight from the product record wherever they're shown
  // (including this dashboard) so the same product never shows two
  // different numbers for the same metric.
  async getDashboardSummary(id: string) {
    await this.findOne(id);

    const [
      requirements,
      activeTestPlans,
      testCases,
      testsExecuted,
      failedTests,
      blockedTests,
      criticalDefects,
      testCasesWithAutomation,
    ] = await Promise.all([
      this.prisma.requirement.count({ where: { productId: id } }),
      this.prisma.testPlan.count({
        where: { productId: id, status: 'ACTIVE' },
      }),
      this.prisma.testCase.count({
        where: { testScenario: { productId: id } },
      }),
      this.prisma.testExecution.count({
        where: {
          testCase: { testScenario: { productId: id } },
          status: { not: 'PENDING' },
        },
      }),
      this.prisma.testExecution.count({
        where: {
          testCase: { testScenario: { productId: id } },
          status: 'FAIL',
        },
      }),
      this.prisma.testExecution.count({
        where: {
          testCase: { testScenario: { productId: id } },
          status: 'BLOCKED',
        },
      }),
      this.prisma.defect.count({
        where: {
          productId: id,
          severity: 'CRITICAL',
          status: { notIn: ['RESOLVED', 'CLOSED'] },
        },
      }),
      this.prisma.testCase.count({
        where: { testScenario: { productId: id }, automations: { some: {} } },
      }),
    ]);

    const automationCoveragePercent =
      testCases === 0
        ? 0
        : Math.round((testCasesWithAutomation / testCases) * 100);

    return {
      requirements,
      activeTestPlans,
      testCases,
      testsExecuted,
      failedTests,
      blockedTests,
      criticalDefects,
      automationCoveragePercent,
    };
  }

  async bulkImport(
    rows: Record<string, string>[],
    actor: AuthenticatedUser,
  ): Promise<ImportResult> {
    const errors: ImportRowError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // account for the header line
      const raw = rows[i];

      const organizationName = raw['Organization Name']?.trim();
      const organization = organizationName
        ? await this.prisma.organization.findFirst({
            where: { name: { equals: organizationName, mode: 'insensitive' } },
          })
        : null;

      if (!organization) {
        errors.push({
          row: rowNumber,
          message: `Organization "${organizationName ?? ''}" not found`,
        });
        continue;
      }

      const candidate = {
        organizationId: organization.id,
        name: raw.name,
        description: raw.description,
        status: raw.status?.trim().toUpperCase() || undefined,
        environment: raw.environment,
        release: raw.release,
        testCoverage: this.parseImportInt(raw.testCoverage),
        passRate: this.parseImportInt(raw.passRate),
        releaseReadiness:
          raw.releaseReadiness?.trim().toUpperCase() || undefined,
      };

      const result = await validateRow(CreateProductDto, candidate);
      if ('error' in result) {
        errors.push({ row: rowNumber, message: result.error });
        continue;
      }

      try {
        await this.create(result.dto);
        successCount++;
      } catch (error) {
        errors.push({
          row: rowNumber,
          message:
            error instanceof Error ? error.message : 'Failed to create row',
        });
      }
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'import',
      entityType: 'Product',
      entityId: undefined,
      summary: `Imported ${successCount} of ${rows.length} product(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  // CSV cells arrive as strings (or missing); testCoverage/passRate are
  // required numeric fields on CreateProductDto, so an empty cell must fail
  // validation ("required") rather than silently becoming 0.
  private parseImportInt(value: string | undefined): number | undefined {
    const trimmed = value?.trim();
    return trimmed ? Number(trimmed) : undefined;
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            requirements: true,
            testPlans: true,
            testScenarios: true,
            defects: true,
            apiTestRequests: true,
            performanceTests: true,
            securityTests: true,
            uatCycles: true,
            releases: true,
            environments: true,
            documents: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const blockers: string[] = [];
    if (product._count.requirements > 0) {
      blockers.push(`${product._count.requirements} requirement(s)`);
    }
    if (product._count.testPlans > 0) {
      blockers.push(`${product._count.testPlans} test plan(s)`);
    }
    if (product._count.testScenarios > 0) {
      blockers.push(`${product._count.testScenarios} test scenario(s)`);
    }
    if (product._count.defects > 0) {
      blockers.push(`${product._count.defects} defect(s)`);
    }
    if (product._count.apiTestRequests > 0) {
      blockers.push(`${product._count.apiTestRequests} API test request(s)`);
    }
    if (product._count.performanceTests > 0) {
      blockers.push(`${product._count.performanceTests} performance test(s)`);
    }
    if (product._count.securityTests > 0) {
      blockers.push(`${product._count.securityTests} security test(s)`);
    }
    if (product._count.uatCycles > 0) {
      blockers.push(`${product._count.uatCycles} UAT cycle(s)`);
    }
    if (product._count.releases > 0) {
      blockers.push(`${product._count.releases} release(s)`);
    }
    if (product._count.environments > 0) {
      blockers.push(`${product._count.environments} environment(s)`);
    }
    if (product._count.documents > 0) {
      blockers.push(`${product._count.documents} document(s)`);
    }
    if (blockers.length > 0) {
      throw new ConflictException(
        `This product cannot be deleted because it has ${blockers.join(' and ')}.`,
      );
    }

    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This product cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }

    if (actor) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'delete',
        entityType: 'Product',
        entityId: id,
        summary: `Deleted product "${product.name}"`,
      });
    }
  }
}
