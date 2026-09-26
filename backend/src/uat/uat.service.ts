import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { UatCycleStatus } from '../../generated/prisma/enums.js';
import { CreateUatCycleDto } from './dto/create-uat-cycle.dto';
import { UpdateUatCycleDto } from './dto/update-uat-cycle.dto';
import { SignOffUatCycleDto } from './dto/sign-off-uat-cycle.dto';
import { CreateUatTestCaseDto } from './dto/create-uat-test-case.dto';
import { UpdateUatTestCaseDto } from './dto/update-uat-test-case.dto';
import { CreateUatExecutionDto } from './dto/create-uat-execution.dto';
import { UpdateUatExecutionDto } from './dto/update-uat-execution.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';
import {
  assertApprovalComment,
  assertWorkflowTransition,
} from '../admin-config/admin-config.service';

const PRODUCT_REF = { select: { id: true, name: true, organizationId: true } };
const RELEASE_REF = { select: { id: true, name: true, version: true } };

const CYCLE_LIST_SELECT_EXTRA = {
  product: PRODUCT_REF,
  release: RELEASE_REF,
  testCases: {
    select: {
      id: true,
      executions: {
        take: 1,
        orderBy: { executedAt: 'desc' as const },
        select: { status: true },
      },
    },
  },
};

const CYCLE_DETAIL_INCLUDE = {
  product: PRODUCT_REF,
  release: RELEASE_REF,
  testCases: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      requirement: { select: { id: true, title: true } },
      steps: { orderBy: { stepNumber: 'asc' as const } },
      executions: {
        orderBy: { executedAt: 'desc' as const },
        include: {
          environment: { select: { id: true, name: true } },
          defect: { select: { id: true, title: true, status: true } },
        },
      },
    },
  },
};

type TestCaseWithLatestStatus = { executions: { status: string }[] };

function computeSummary(testCases: TestCaseWithLatestStatus[]) {
  const summary = { notRun: 0, pass: 0, fail: 0, blocked: 0, notApplicable: 0 };

  for (const testCase of testCases) {
    const status = testCase.executions[0]?.status ?? 'NOT_RUN';
    switch (status) {
      case 'PASS':
        summary.pass += 1;
        break;
      case 'FAIL':
        summary.fail += 1;
        break;
      case 'BLOCKED':
        summary.blocked += 1;
        break;
      case 'NOT_APPLICABLE':
        summary.notApplicable += 1;
        break;
      default:
        summary.notRun += 1;
    }
  }

  return summary;
}

type CycleWithSummarySource = {
  testCases: TestCaseWithLatestStatus[];
} & Record<string, unknown>;

// List view: summary counts replace the (otherwise heavy) full testCases array.
function summarize(cycle: CycleWithSummarySource) {
  const { testCases, ...rest } = cycle;
  return { ...rest, testCaseCount: testCases.length, summary: computeSummary(testCases) };
}

// Detail view: summary counts are ADDED alongside the full testCases array
// (already fetched with each test case's full execution history), rather
// than replacing it -- the frontend renders both the dashboard numbers and
// the full nested detail from the same response.
function withSummary<T extends CycleWithSummarySource>(cycle: T) {
  return { ...cycle, testCaseCount: cycle.testCases.length, summary: computeSummary(cycle.testCases) };
}

@Injectable()
export class UatService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(productId: string | undefined, actorOrganizationId: string | null) {
    const cycles = await this.prisma.uatCycle.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: CYCLE_LIST_SELECT_EXTRA,
      orderBy: { createdAt: 'desc' },
    });

    return cycles.map((cycle) => summarize(cycle));
  }

  // Every id-based route below (cycle, test case and execution sub-routes
  // alike) is reached directly by a UUID, bypassing findAll's own scope
  // filter -- so each one re-checks the cycle's product against the actor's
  // organization before returning or mutating anything.
  private async assertCycleInScope(id: string, actorOrganizationId: string | null) {
    const cycle = await this.prisma.uatCycle.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!cycle) {
      throw new NotFoundException(`UAT cycle ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, cycle.product.organizationId, `UAT cycle ${id} not found`);
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

  async findOne(id: string, actorOrganizationId: string | null) {
    await this.assertCycleInScope(id, actorOrganizationId);
    const cycle = await this.prisma.uatCycle.findUnique({
      where: { id },
      include: CYCLE_DETAIL_INCLUDE,
    });

    if (!cycle) {
      throw new NotFoundException(`UAT cycle ${id} not found`);
    }

    return withSummary(cycle);
  }

  async create(dto: CreateUatCycleDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    try {
      const cycle = await this.prisma.uatCycle.create({
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          name: dto.name,
          description: dto.description,
        },
        include: CYCLE_LIST_SELECT_EXTRA,
      });
      return summarize(cycle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUatCycleDto, actor: AuthenticatedUser) {
    await this.assertCycleInScope(id, actor.organizationId);
    const existing = await this.prisma.uatCycle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`UAT cycle ${id} not found`);
    }

    await assertWorkflowTransition(
      this.prisma,
      'UAT_CYCLE',
      existing.status,
      dto.status,
    );

    try {
      const cycle = await this.prisma.uatCycle.update({
        where: { id },
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          name: dto.name,
          description: dto.description,
          status: dto.status,
        },
        include: CYCLE_LIST_SELECT_EXTRA,
      });
      return summarize(cycle);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`UAT cycle ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    await this.assertCycleInScope(id, actor.organizationId);
    const cycle = await this.prisma.uatCycle.findUnique({
      where: { id },
      include: { _count: { select: { testCases: true } } },
    });

    if (!cycle) {
      throw new NotFoundException(`UAT cycle ${id} not found`);
    }

    if (cycle._count.testCases > 0) {
      throw new ConflictException(
        `This UAT cycle cannot be deleted because it has ${cycle._count.testCases} test case(s).`,
      );
    }

    try {
      await this.prisma.uatCycle.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`UAT cycle ${id} not found`);
      }
      throw error;
    }
  }

  async signOff(id: string, dto: SignOffUatCycleDto, actor: AuthenticatedUser) {
    await this.assertCycleInScope(id, actor.organizationId);
    const existing = await this.prisma.uatCycle.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`UAT cycle ${id} not found`);
    }

    const signable: UatCycleStatus[] = [
      UatCycleStatus.COMPLETED,
      UatCycleStatus.APPROVED,
      UatCycleStatus.REJECTED,
    ];
    if (!signable.includes(existing.status)) {
      throw new BadRequestException(
        'This UAT cycle must be COMPLETED before it can be signed off.',
      );
    }
    await assertWorkflowTransition(
      this.prisma,
      'UAT_CYCLE',
      existing.status,
      dto.decision,
    );
    await assertApprovalComment(
      this.prisma,
      'UAT_SIGN_OFF',
      dto.decision,
      dto.notes,
    );

    const cycle = await this.prisma.uatCycle.update({
      where: { id },
      data: {
        status: dto.decision,
        signOffBy: dto.signOffBy,
        signOffAt: new Date(),
        signOffNotes: dto.notes,
      },
      include: CYCLE_LIST_SELECT_EXTRA,
    });
    return summarize(cycle);
  }

  async addTestCase(cycleId: string, dto: CreateUatTestCaseDto, actor: AuthenticatedUser) {
    await this.assertCycleInScope(cycleId, actor.organizationId);
    const cycle = await this.prisma.uatCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException(`UAT cycle ${cycleId} not found`);
    }

    if (dto.requirementId) {
      await this.validateRequirementBelongsToProduct(dto.requirementId, cycle.productId);
    }

    try {
      return await this.prisma.uatTestCase.create({
        data: {
          uatCycleId: cycleId,
          requirementId: dto.requirementId,
          title: dto.title,
          description: dto.description,
          expectedResult: dto.expectedResult,
          assignedTester: dto.assignedTester,
          steps: {
            create: dto.steps.map((step, index) => ({
              stepNumber: index + 1,
              action: step.action,
              expectedResult: step.expectedResult,
            })),
          },
        },
        include: {
          requirement: { select: { id: true, title: true } },
          steps: { orderBy: { stepNumber: 'asc' } },
          executions: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Requirement reference not found');
      }
      throw error;
    }
  }

  async updateTestCase(
    cycleId: string,
    testCaseId: string,
    dto: UpdateUatTestCaseDto,
    actor: AuthenticatedUser,
  ) {
    const testCase = await this.findTestCaseOrThrow(cycleId, testCaseId, actor.organizationId);

    const effectiveRequirementId =
      dto.requirementId !== undefined ? dto.requirementId : testCase.requirementId;
    if (effectiveRequirementId) {
      await this.validateRequirementBelongsToProduct(effectiveRequirementId, testCase.uatCycle.productId);
    }

    try {
      return await this.prisma.uatTestCase.update({
        where: { id: testCaseId },
        data: {
          requirementId: dto.requirementId,
          title: dto.title,
          description: dto.description,
          expectedResult: dto.expectedResult,
          assignedTester: dto.assignedTester,
          ...(dto.steps !== undefined
            ? {
                steps: {
                  deleteMany: {},
                  create: dto.steps.map((step, index) => ({
                    stepNumber: index + 1,
                    action: step.action,
                    expectedResult: step.expectedResult,
                  })),
                },
              }
            : {}),
        },
        include: {
          requirement: { select: { id: true, title: true } },
          steps: { orderBy: { stepNumber: 'asc' } },
          executions: {
            orderBy: { executedAt: 'desc' },
            include: {
              environment: { select: { id: true, name: true } },
              defect: { select: { id: true, title: true, status: true } },
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`UAT test case ${testCaseId} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Requirement reference not found');
        }
      }
      throw error;
    }
  }

  async removeTestCase(cycleId: string, testCaseId: string, actor: AuthenticatedUser) {
    await this.findTestCaseOrThrow(cycleId, testCaseId, actor.organizationId);
    const testCase = await this.prisma.uatTestCase.findUnique({
      where: { id: testCaseId },
      include: { _count: { select: { executions: true } } },
    });

    if (!testCase || testCase.uatCycleId !== cycleId) {
      throw new NotFoundException(`UAT test case ${testCaseId} not found on cycle ${cycleId}`);
    }

    if (testCase._count.executions > 0) {
      throw new ConflictException(
        `This UAT test case cannot be deleted because it has ${testCase._count.executions} execution(s).`,
      );
    }

    await this.prisma.uatTestCase.delete({ where: { id: testCaseId } });
  }

  async addExecution(
    cycleId: string,
    testCaseId: string,
    dto: CreateUatExecutionDto,
    actor: AuthenticatedUser,
  ) {
    const testCase = await this.findTestCaseOrThrow(cycleId, testCaseId, actor.organizationId);
    const productId = testCase.uatCycle.productId;

    await this.validateEnvironmentBelongsToProduct(dto.environmentId, productId);
    if (dto.defectId) {
      await this.validateDefectBelongsToProduct(dto.defectId, productId);
    }

    try {
      return await this.prisma.uatExecution.create({
        data: {
          uatTestCaseId: testCaseId,
          environmentId: dto.environmentId,
          defectId: dto.defectId,
          status: dto.status,
          actualResult: dto.actualResult,
          notes: dto.notes,
          evidence: dto.evidence,
          executedBy: dto.executedBy,
          executedAt: dto.executedAt ? new Date(dto.executedAt) : undefined,
        },
        include: {
          environment: { select: { id: true, name: true } },
          defect: { select: { id: true, title: true, status: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Environment or defect reference not found');
      }
      throw error;
    }
  }

  async updateExecution(
    cycleId: string,
    testCaseId: string,
    executionId: string,
    dto: UpdateUatExecutionDto,
    actor: AuthenticatedUser,
  ) {
    const testCase = await this.findTestCaseOrThrow(cycleId, testCaseId, actor.organizationId);
    const execution = await this.findExecutionOrThrow(testCaseId, executionId);
    const productId = testCase.uatCycle.productId;

    const effectiveEnvironmentId = dto.environmentId ?? execution.environmentId;
    await this.validateEnvironmentBelongsToProduct(effectiveEnvironmentId, productId);

    const effectiveDefectId = dto.defectId !== undefined ? dto.defectId : execution.defectId;
    if (effectiveDefectId) {
      await this.validateDefectBelongsToProduct(effectiveDefectId, productId);
    }

    try {
      return await this.prisma.uatExecution.update({
        where: { id: executionId },
        data: {
          environmentId: dto.environmentId,
          defectId: dto.defectId,
          status: dto.status,
          actualResult: dto.actualResult,
          notes: dto.notes,
          evidence: dto.evidence,
          executedBy: dto.executedBy,
          executedAt: dto.executedAt ? new Date(dto.executedAt) : undefined,
        },
        include: {
          environment: { select: { id: true, name: true } },
          defect: { select: { id: true, title: true, status: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`UAT execution ${executionId} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Environment or defect reference not found');
        }
      }
      throw error;
    }
  }

  async removeExecution(
    cycleId: string,
    testCaseId: string,
    executionId: string,
    actor: AuthenticatedUser,
  ) {
    await this.findTestCaseOrThrow(cycleId, testCaseId, actor.organizationId);
    await this.findExecutionOrThrow(testCaseId, executionId);
    await this.prisma.uatExecution.delete({ where: { id: executionId } });
  }

  private async findTestCaseOrThrow(
    cycleId: string,
    testCaseId: string,
    actorOrganizationId: string | null,
  ) {
    const testCase = await this.prisma.uatTestCase.findUnique({
      where: { id: testCaseId },
      include: { uatCycle: { select: { productId: true, product: { select: { organizationId: true } } } } },
    });

    if (!testCase || testCase.uatCycleId !== cycleId) {
      throw new NotFoundException(`UAT test case ${testCaseId} not found on cycle ${cycleId}`);
    }
    assertSameOrganization(
      actorOrganizationId,
      testCase.uatCycle.product.organizationId,
      `UAT test case ${testCaseId} not found on cycle ${cycleId}`,
    );

    return testCase;
  }

  private async findExecutionOrThrow(testCaseId: string, executionId: string) {
    const execution = await this.prisma.uatExecution.findUnique({ where: { id: executionId } });

    if (!execution || execution.uatTestCaseId !== testCaseId) {
      throw new NotFoundException(`UAT execution ${executionId} not found on test case ${testCaseId}`);
    }

    return execution;
  }

  private async validateRequirementBelongsToProduct(requirementId: string, productId: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
      select: { id: true, productId: true },
    });
    if (!requirement) {
      throw new BadRequestException(`Requirement ${requirementId} not found`);
    }
    if (requirement.productId !== productId) {
      throw new BadRequestException(
        `Requirement ${requirementId} does not belong to this UAT cycle's product.`,
      );
    }
  }

  private async validateEnvironmentBelongsToProduct(environmentId: string, productId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true, productId: true },
    });
    if (!environment) {
      throw new BadRequestException(`Environment ${environmentId} not found`);
    }
    if (environment.productId !== productId) {
      throw new BadRequestException(
        `Environment ${environmentId} does not belong to this UAT cycle's product.`,
      );
    }
  }

  private async validateDefectBelongsToProduct(defectId: string, productId: string) {
    const defect = await this.prisma.defect.findUnique({
      where: { id: defectId },
      select: { id: true, productId: true },
    });
    if (!defect) {
      throw new BadRequestException(`Defect ${defectId} not found`);
    }
    if (defect.productId !== productId) {
      throw new BadRequestException(
        `Defect ${defectId} does not belong to this UAT cycle's product.`,
      );
    }
  }
}
