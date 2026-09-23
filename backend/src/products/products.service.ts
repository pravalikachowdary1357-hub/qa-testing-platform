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
import { ReleaseQualityService } from '../release-quality/release-quality.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization, organizationScopeWhere } from '../common/organization-scope.util';
import { validateRow } from '../common/import/validate-row.util';
import type {
  ImportResult,
  ImportRowError,
} from '../common/import/import-result.interface';

const DASHBOARD_TREND_WEEKS = 8;

// Buckets a set of timestamps into `weeks` trailing calendar weeks (oldest
// first), so the Dashboard can plot a simple trend without a dedicated
// history/snapshot table -- each point is a real count derived from existing
// timestamped rows, not a stored/precomputed series.
function bucketByWeek(
  dates: Date[],
  weeks: number,
): { weekStart: string; count: number }[] {
  const now = new Date();
  const buckets: { weekStart: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - i * 7);
    buckets.push({ weekStart: weekStart.toISOString(), count: 0 });
  }
  for (const date of dates) {
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    const weekIndex = weeks - 1 - Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < weeks) {
      buckets[weekIndex].count += 1;
    }
  }
  return buckets;
}

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
    private readonly releaseQuality: ReleaseQualityService,
  ) {}

  findAll(actorOrganizationId: string | null) {
    return this.prisma.product.findMany({
      where: organizationScopeWhere(actorOrganizationId),
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, product.organizationId, `Product ${id} not found`);

    return product;
  }

  // A Product's Project, if set, must belong to the same Organization as the
  // Product itself -- otherwise the Organization -> Project -> Product
  // hierarchy silently breaks. Neither FK was ever cross-checked against the
  // other before this (each was only validated independently against its
  // own parent table), so a Product could previously be saved with an
  // organizationId that didn't match its own project.organizationId.
  private async assertProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) {
      throw new BadRequestException(`Project ${projectId} not found`);
    }
    if (project.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected project does not belong to this organization.',
      );
    }
  }

  async create(dto: CreateProductDto, actor?: AuthenticatedUser) {
    if (actor) {
      assertSameOrganization(
        actor.organizationId,
        dto.organizationId,
        `Organization ${dto.organizationId} not found`,
      );
    }
    if (dto.projectId) {
      await this.assertProjectBelongsToOrganization(dto.projectId, dto.organizationId);
    }

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
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { organizationId: true, projectId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    if (actor) {
      assertSameOrganization(actor.organizationId, existing.organizationId, `Product ${id} not found`);
      // Reassignment guard: a scoped actor editing their own product still
      // can't move it into a DIFFERENT organization by supplying a foreign
      // organizationId in the update body.
      if (dto.organizationId) {
        assertSameOrganization(
          actor.organizationId,
          dto.organizationId,
          `Organization ${dto.organizationId} not found`,
        );
      }
    }

    if (dto.projectId || dto.organizationId) {
      const effectiveOrganizationId = dto.organizationId ?? existing.organizationId;
      const effectiveProjectId = dto.projectId !== undefined ? dto.projectId : existing.projectId;
      if (effectiveProjectId) {
        await this.assertProjectBelongsToOrganization(effectiveProjectId, effectiveOrganizationId);
      }
    }

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

  // Powers the Dashboard once it's scoped to a single product. Every value
  // here is either a live count/aggregation over real rows, or (for pass
  // rate/test coverage/open defects/release readiness) reuses
  // ReleaseQualityService's existing product-scoped quality engine instead
  // of Product's own manually-entered testCoverage/passRate/openDefects/
  // releaseReadiness columns -- those four columns remain editable
  // elsewhere (the Product form, CSV import/export) for now, but the
  // Dashboard itself never shows a hand-entered number as if it were
  // calculated.
  async getDashboardSummary(id: string, actorOrganizationId: string | null) {
    await this.findOne(id, actorOrganizationId);

    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - DASHBOARD_TREND_WEEKS * 7);

    const [
      requirements,
      activeTestPlans,
      testCases,
      testsExecuted,
      failedTests,
      blockedTests,
      testCasesWithAutomation,
      quality,
      defectSeverityGroups,
      requirementRiskGroups,
      recentExecutions,
      recentDefects,
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
      this.prisma.testCase.count({
        where: { testScenario: { productId: id }, automations: { some: {} } },
      }),
      this.releaseQuality.getProductQuality(id),
      this.prisma.defect.groupBy({
        by: ['severity'],
        where: { productId: id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
        _count: { _all: true },
      }),
      this.prisma.requirement.groupBy({
        by: ['riskLevel'],
        where: { productId: id },
        _count: { _all: true },
      }),
      this.prisma.testExecution.findMany({
        where: {
          testCase: { testScenario: { productId: id } },
          executedAt: { gte: eightWeeksAgo },
        },
        select: { executedAt: true },
      }),
      this.prisma.defect.findMany({
        where: { productId: id, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
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
      criticalDefects: quality.defects.criticalOpenCount,
      automationCoveragePercent,
      passRatePercent: quality.testExecutionSummary.passRatePercent,
      testCoveragePercent: quality.testExecutionSummary.testCoveragePercent,
      openDefectsCount: quality.defects.openCount,
      releaseReadiness: quality.readiness,
      defectSeverityDistribution: defectSeverityGroups.map((group) => ({
        severity: group.severity,
        count: group._count._all,
      })),
      requirementRiskDistribution: requirementRiskGroups.map((group) => ({
        riskLevel: group.riskLevel,
        count: group._count._all,
      })),
      trends: {
        testExecutionsPerWeek: bucketByWeek(
          recentExecutions.map((execution) => execution.executedAt),
          DASHBOARD_TREND_WEEKS,
        ),
        defectsOpenedPerWeek: bucketByWeek(
          recentDefects.map((defect) => defect.createdAt),
          DASHBOARD_TREND_WEEKS,
        ),
      },
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
        await this.create(result.dto, actor);
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
    if (actor) {
      assertSameOrganization(actor.organizationId, product.organizationId, `Product ${id} not found`);
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
