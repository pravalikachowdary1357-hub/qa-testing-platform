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
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { organization: ORGANIZATION_REF_SELECT },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: dto,
        include: { organization: ORGANIZATION_REF_SELECT },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          `Organization ${dto.organizationId} not found`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        include: { organization: ORGANIZATION_REF_SELECT },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Product ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            `Organization ${dto.organizationId} not found`,
          );
        }
      }
      throw error;
    }
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
        releaseReadiness: raw.releaseReadiness?.trim().toUpperCase() || undefined,
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
          message: error instanceof Error ? error.message : 'Failed to create row',
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

  async remove(id: string) {
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
  }
}
