import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';
import {
  assertApprovalComment,
  assertWorkflowTransition,
} from '../admin-config/admin-config.service';
import { TestPlanStatus } from '../../generated/prisma/enums.js';
import { CompleteTestPlanDto, ReviewTestPlanDto } from './dto/review-test-plan.dto';
import type { TestPlanGovernanceDto } from './dto/test-plan-governance.dto';
import { OPEN_DEFECT_STATUSES } from '../defects/defect-status';
import { notifySubmittedForApproval } from '../notifications/notification-events';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };
const TEST_PLAN_INCLUDE = {
  product: { select: { id: true, name: true, organizationId: true } },
  release: RELEASE_REF_SELECT,
  requirements: { select: { id: true, title: true, status: true } },
  reviewedBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
};

// Statuses a plan only reaches through the Test Manager's decisions:
// APPROVED via POST :id/review, COMPLETED via POST :id/complete.
const DECISION_STATUSES: TestPlanStatus[] = [
  TestPlanStatus.APPROVED,
  TestPlanStatus.COMPLETED,
];

const REVIEW_STATUS: Record<ReviewTestPlanDto['decision'], TestPlanStatus> = {
  APPROVED: TestPlanStatus.APPROVED,
  REJECTED: TestPlanStatus.DRAFT,
  RETURNED_FOR_REWORK: TestPlanStatus.DRAFT,
};

// Editing any of these on an approved plan changes what was approved, so
// the plan goes back to In Review for re-approval.
const APPROVED_CONTENT_FIELDS = [
  'name',
  'description',
  'isMaster',
  'scope',
  'objectives',
  'testLevels',
  'testTypes',
  'approach',
  'entryCriteria',
  'exitCriteria',
  'estimatedEffortHours',
  'resources',
  'risks',
  'startDate',
  'endDate',
] as const;

function governanceData(dto: TestPlanGovernanceDto) {
  return {
    isMaster: dto.isMaster,
    scope: dto.scope,
    objectives: dto.objectives,
    testLevels: dto.testLevels,
    testTypes: dto.testTypes,
    approach: dto.approach,
    entryCriteria: dto.entryCriteria,
    exitCriteria: dto.exitCriteria,
    estimatedEffortHours: dto.estimatedEffortHours,
    resources: dto.resources,
    risks: dto.risks,
    milestones:
      dto.milestones === undefined
        ? undefined
        : (dto.milestones.map((m) => ({
            name: m.name,
            dueDate: m.dueDate ?? null,
            done: m.done ?? false,
          })) as unknown as Prisma.InputJsonValue),
  };
}

function normalize(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
    return value.slice(0, 10);
  if (value === null || value === undefined || value === '') return '';
  return JSON.stringify(value);
}

// DTOs accept plain date strings (e.g. "2026-09-01"), but Prisma 7's
// query engine requires a full ISO-8601 DateTime for DateTime columns.
function toDate(value?: string): Date | undefined {
  return value === undefined ? undefined : new Date(value);
}

@Injectable()
export class TestPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.testPlan.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: TEST_PLAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const testPlan = await this.prisma.testPlan.findUnique({
      where: { id },
      include: TEST_PLAN_INCLUDE,
    });

    if (!testPlan) {
      throw new NotFoundException(`Test plan ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, testPlan.product.organizationId, `Test plan ${id} not found`);

    return testPlan;
  }

  async create(
    dto: CreateTestPlanDto,
    actor: AuthenticatedUser,
    options: { notify?: boolean } = {},
  ) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    this.validateDateRange(dto.startDate, dto.endDate);
    if (dto.status && DECISION_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        'A new test plan cannot start as Approved or Completed. Submit it for review (In Review) and a Test Manager approves it.',
      );
    }

    const requirementIds = dto.requirementIds ?? [];
    if (requirementIds.length > 0) {
      await this.validateRequirementsBelongToProduct(requirementIds, dto.productId);
    }

    let created;
    try {
      created = await this.prisma.testPlan.create({
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          name: dto.name,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          owner: dto.owner,
          startDate: toDate(dto.startDate),
          endDate: toDate(dto.endDate),
          ...governanceData(dto),
          requirements:
            requirementIds.length > 0
              ? { connect: requirementIds.map((id) => ({ id })) }
              : undefined,
        },
        include: TEST_PLAN_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
    if (options.notify !== false && created.status === TestPlanStatus.IN_REVIEW) {
      await notifySubmittedForApproval(this.prisma, actor, {
        kind: 'TestPlan',
        id: created.id,
        name: created.name,
        organizationId: created.product.organizationId,
      });
    }
    return created;
  }

  async bulkImport(
    rows: Record<string, string>[],
    productId: string,
    actor: AuthenticatedUser,
  ): Promise<ImportResult> {
    const errors: ImportRowError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // account for the header line
      const raw = rows[i];
      const candidate = {
        productId,
        name: raw.name,
        description: raw.description,
        status: raw.status?.trim().toUpperCase() || undefined,
        priority: raw.priority?.trim().toUpperCase() || undefined,
        owner: raw.owner,
        startDate: raw.startDate?.trim() || undefined,
        endDate: raw.endDate?.trim() || undefined,
      };

      const result = await validateRow(CreateTestPlanDto, candidate);
      if ('error' in result) {
        errors.push({ row: rowNumber, message: result.error });
        continue;
      }

      try {
        await this.create(result.dto, actor, { notify: false });
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
      entityType: 'TestPlan',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} testplan(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  async update(id: string, dto: UpdateTestPlanDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.testPlan.findUnique({
      where: { id },
      include: {
        requirements: { select: { id: true } },
        product: { select: { organizationId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Test plan ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Test plan ${id} not found`);

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveStartDate =
      dto.startDate !== undefined ? dto.startDate : (existing.startDate ?? undefined);
    const effectiveEndDate =
      dto.endDate !== undefined ? dto.endDate : (existing.endDate ?? undefined);
    this.validateDateRange(effectiveStartDate, effectiveEndDate);

    // If the product is changing but the caller didn't also resend the
    // requirement list, re-check the plan's existing requirements against
    // the new product so a product change can't silently leave requirements
    // attached that no longer belong to it.
    const effectiveRequirementIds =
      dto.requirementIds ?? (dto.productId ? existing.requirements.map((r) => r.id) : undefined);

    if (effectiveRequirementIds && effectiveRequirementIds.length > 0) {
      await this.validateRequirementsBelongToProduct(effectiveRequirementIds, effectiveProductId);
    }

    if (
      dto.status &&
      dto.status !== existing.status &&
      DECISION_STATUSES.includes(dto.status)
    ) {
      throw new BadRequestException(
        dto.status === TestPlanStatus.APPROVED
          ? 'Use Review (approve) to approve a test plan.'
          : 'Use Sign off completion to complete a test plan.',
      );
    }

    // Changing an approved plan's content invalidates the approval.
    let status = dto.status;
    let resetApproval = false;
    if (
      existing.status === TestPlanStatus.APPROVED &&
      (!dto.status || dto.status === existing.status)
    ) {
      const record = existing as unknown as Record<string, unknown>;
      const changed =
        APPROVED_CONTENT_FIELDS.some((field) => {
          const next = (dto as unknown as Record<string, unknown>)[field];
          return next !== undefined && normalize(next) !== normalize(record[field]);
        }) ||
        (dto.requirementIds !== undefined &&
          [...dto.requirementIds].sort().join(',') !==
            existing.requirements.map((r) => r.id).sort().join(','));
      if (changed) {
        status = TestPlanStatus.IN_REVIEW;
        resetApproval = true;
      }
    }

    await assertWorkflowTransition(
      this.prisma,
      'TEST_PLAN',
      existing.status,
      status,
    );

    let updated;
    try {
      updated = await this.prisma.testPlan.update({
        where: { id },
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          name: dto.name,
          description: dto.description,
          status,
          priority: dto.priority,
          owner: dto.owner,
          startDate: toDate(dto.startDate),
          endDate: toDate(dto.endDate),
          ...governanceData(dto),
          ...(resetApproval
            ? { reviewedById: null, reviewedAt: null, reviewComment: null }
            : {}),
          requirements:
            dto.requirementIds !== undefined
              ? { set: dto.requirementIds.map((requirementId) => ({ id: requirementId })) }
              : undefined,
        },
        include: TEST_PLAN_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test plan ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
      }
      throw error;
    }
    if (
      updated.status === TestPlanStatus.IN_REVIEW &&
      existing.status !== TestPlanStatus.IN_REVIEW
    ) {
      await notifySubmittedForApproval(this.prisma, actor, {
        kind: 'TestPlan',
        id: updated.id,
        name: updated.name,
        organizationId: updated.product.organizationId,
      });
    }
    return updated;
  }

  // Test Manager decision on a plan that was submitted for review.
  async review(id: string, dto: ReviewTestPlanDto, actor: AuthenticatedUser) {
    const plan = await this.findOne(id, actor.organizationId);
    if (plan.status !== TestPlanStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Only a test plan that is In Review can be approved, rejected, or returned for rework.',
      );
    }
    if (dto.decision === 'APPROVED' && !plan.exitCriteria?.trim()) {
      throw new BadRequestException(
        'Define the exit (completion) criteria before approving the test plan.',
      );
    }
    const next = REVIEW_STATUS[dto.decision];
    await assertWorkflowTransition(this.prisma, 'TEST_PLAN', plan.status, next);
    await assertApprovalComment(
      this.prisma,
      'TEST_PLAN_APPROVAL',
      dto.decision,
      dto.comment,
      actor,
    );
    return this.prisma.testPlan.update({
      where: { id },
      data: {
        status: next,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewComment: dto.comment ?? null,
      },
      include: TEST_PLAN_INCLUDE,
    });
  }

  // Test Manager sign-off that the plan's completion criteria are met.
  async complete(id: string, dto: CompleteTestPlanDto, actor: AuthenticatedUser) {
    const plan = await this.findOne(id, actor.organizationId);
    if (
      plan.status !== TestPlanStatus.ACTIVE &&
      plan.status !== TestPlanStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only an Approved or Active test plan can be signed off as completed.',
      );
    }
    if (!plan.exitCriteria?.trim()) {
      throw new BadRequestException(
        'This test plan has no exit (completion) criteria to sign off against.',
      );
    }
    await assertWorkflowTransition(
      this.prisma,
      'TEST_PLAN',
      plan.status,
      TestPlanStatus.COMPLETED,
    );
    await assertApprovalComment(
      this.prisma,
      'TEST_PLAN_APPROVAL',
      'APPROVED',
      dto.comment ?? dto.summary,
      actor,
    );
    return this.prisma.testPlan.update({
      where: { id },
      data: {
        status: TestPlanStatus.COMPLETED,
        completedById: actor.id,
        completedAt: new Date(),
        completionSummary: dto.summary,
      },
      include: TEST_PLAN_INCLUDE,
    });
  }

  // Test status / summary report for one plan (Roles & Responsibilities
  // section 3: "Prepare test status reports / test summary reports").
  // Everything is computed live from the records in the plan's scope.
  async summaryReport(id: string, actor: AuthenticatedUser) {
    const plan = await this.findOne(id, actor.organizationId);
    // Defect titles are only listed for roles that may read defects.
    const canReadDefects = actor.permissions.includes('defects:read');
    const requirementIds = plan.requirements.map((r) => r.id);
    const scopeBasis =
      requirementIds.length > 0
        ? 'REQUIREMENTS'
        : plan.releaseId
          ? 'RELEASE'
          : 'PRODUCT';
    const caseWhere: Prisma.TestCaseWhereInput =
      scopeBasis === 'REQUIREMENTS'
        ? { testScenario: { requirementId: { in: requirementIds } } }
        : scopeBasis === 'RELEASE'
          ? { releaseId: plan.releaseId, testScenario: { productId: plan.productId } }
          : { testScenario: { productId: plan.productId } };

    const cases = await this.prisma.testCase.findMany({
      where: caseWhere,
      select: {
        id: true,
        status: true,
        testScenario: { select: { requirementId: true } },
        testExecutions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    });
    const caseIds = cases.map((c) => c.id);

    const execution = { total: cases.length, pass: 0, fail: 0, blocked: 0, notRun: 0 };
    const caseStatus: Record<string, number> = {};
    for (const c of cases) {
      caseStatus[c.status] = (caseStatus[c.status] ?? 0) + 1;
      const last = c.testExecutions[0]?.status;
      if (last === 'PASS') execution.pass++;
      else if (last === 'FAIL') execution.fail++;
      else if (last === 'BLOCKED') execution.blocked++;
      else execution.notRun++;
    }
    const executed = execution.total - execution.notRun;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

    const covered = new Set(
      cases.map((c) => c.testScenario.requirementId).filter((r): r is string => !!r),
    );
    const defectWhere: Prisma.DefectWhereInput =
      scopeBasis === 'PRODUCT'
        ? { productId: plan.productId }
        : { testCaseId: { in: caseIds.length ? caseIds : ['-'] } };
    const defects = await this.prisma.defect.findMany({
      where: defectWhere,
      select: { id: true, title: true, severity: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const open = defects.filter((d) => OPEN_DEFECT_STATUSES.includes(d.status));
    const bySeverity: Record<string, number> = {};
    for (const d of open) bySeverity[d.severity] = (bySeverity[d.severity] ?? 0) + 1;
    const milestones = (Array.isArray(plan.milestones) ? plan.milestones : []) as {
      name: string;
      dueDate: string | null;
      done: boolean;
    }[];

    return {
      generatedAt: new Date().toISOString(),
      scopeBasis,
      plan,
      requirements: {
        total: requirementIds.length,
        covered: requirementIds.filter((r) => covered.has(r)).length,
        coveragePercent: pct(
          requirementIds.filter((r) => covered.has(r)).length,
          requirementIds.length,
        ),
      },
      testCases: { total: cases.length, byStatus: caseStatus },
      execution: {
        ...execution,
        executed,
        completionPercent: pct(executed, execution.total),
        passRatePercent: pct(execution.pass, executed),
      },
      defects: {
        total: defects.length,
        open: open.length,
        openBySeverity: bySeverity,
        criticalOpen: (canReadDefects ? open : [])
          .filter((d) => d.severity === 'CRITICAL' || d.severity === 'MAJOR')
          .map((d) => ({ id: d.id, title: d.title, severity: d.severity, status: d.status })),
      },
      milestones: {
        total: milestones.length,
        done: milestones.filter((m) => m.done).length,
        overdue: milestones.filter(
          (m) => !m.done && m.dueDate && new Date(m.dueDate) < new Date(),
        ).length,
      },
    };
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.testPlan.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Test plan ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Test plan ${id} not found`);

    try {
      await this.prisma.testPlan.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Test plan ${id} not found`);
      }
      throw error;
    }
  }

  private async assertProductInScope(productId: string, actorOrganizationId: string | null): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { organizationId: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    assertSameOrganization(actorOrganizationId, product.organizationId, `Product ${productId} not found`);
  }

  private validateDateRange(startDate?: string | Date, endDate?: string | Date) {
    if (!startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Start date must be on or before end date.');
    }
  }

  private async validateRequirementsBelongToProduct(requirementIds: string[], productId: string) {
    const requirements = await this.prisma.requirement.findMany({
      where: { id: { in: requirementIds } },
      select: { id: true, productId: true },
    });

    const foundIds = new Set(requirements.map((r) => r.id));
    const missingIds = requirementIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(`Requirement(s) not found: ${missingIds.join(', ')}`);
    }

    const mismatched = requirements.filter((r) => r.productId !== productId);
    if (mismatched.length > 0) {
      throw new BadRequestException(
        `Requirement(s) ${mismatched.map((r) => r.id).join(', ')} do not belong to the selected product.`,
      );
    }
  }
}
