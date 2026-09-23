import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { CreateAutomationRunDto } from './dto/create-automation-run.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization } from '../common/organization-scope.util';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };

const AUTOMATION_INCLUDE = {
  testCase: { select: { id: true, title: true } },
  environment: { select: { id: true, name: true } },
  release: RELEASE_REF_SELECT,
  _count: { select: { runs: true } },
};

const AUTOMATION_DETAIL_INCLUDE = {
  testCase: { select: { id: true, title: true } },
  environment: { select: { id: true, name: true } },
  release: RELEASE_REF_SELECT,
  runs: { orderBy: { startedAt: 'desc' as const } },
};

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.automation.findMany({
      where: {
        ...(productId || actorOrganizationId
          ? {
              testCase: {
                testScenario: {
                  ...(productId ? { productId } : {}),
                  ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
                },
              },
            }
          : {}),
      },
      include: AUTOMATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Every id-based route below is reached directly by an automation UUID,
  // bypassing findAll's own scope filter -- so each one re-checks the
  // automation's test case's product against the actor's organization first.
  private async assertAutomationInScope(id: string, actorOrganizationId: string | null) {
    const automation = await this.prisma.automation.findUnique({
      where: { id },
      select: {
        testCase: { select: { testScenario: { select: { product: { select: { organizationId: true } } } } } },
      },
    });
    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }
    assertSameOrganization(
      actorOrganizationId,
      automation.testCase.testScenario.product.organizationId,
      `Automation ${id} not found`,
    );
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    await this.assertAutomationInScope(id, actorOrganizationId);
    const automation = await this.prisma.automation.findUnique({
      where: { id },
      include: AUTOMATION_DETAIL_INCLUDE,
    });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    return automation;
  }

  async create(dto: CreateAutomationDto, actor: AuthenticatedUser) {
    await this.validateRelationships(dto.testCaseId, dto.environmentId, actor.organizationId);

    try {
      return await this.prisma.automation.create({
        data: {
          testCaseId: dto.testCaseId,
          environmentId: dto.environmentId,
          releaseId: dto.releaseId,
          name: dto.name,
          type: dto.type,
          framework: dto.framework,
          description: dto.description,
          schedule: dto.schedule,
          enabled: dto.enabled,
        },
        include: AUTOMATION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Test case or environment reference not found');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAutomationDto, actor: AuthenticatedUser) {
    await this.assertAutomationInScope(id, actor.organizationId);
    const existing = await this.prisma.automation.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    const effectiveTestCaseId = dto.testCaseId ?? existing.testCaseId;
    const effectiveEnvironmentId =
      dto.environmentId !== undefined ? dto.environmentId : existing.environmentId;

    await this.validateRelationships(effectiveTestCaseId, effectiveEnvironmentId, actor.organizationId);

    try {
      return await this.prisma.automation.update({
        where: { id },
        data: {
          testCaseId: dto.testCaseId,
          environmentId: dto.environmentId,
          releaseId: dto.releaseId,
          name: dto.name,
          type: dto.type,
          framework: dto.framework,
          description: dto.description,
          schedule: dto.schedule,
          enabled: dto.enabled,
        },
        include: AUTOMATION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Automation ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Test case or environment reference not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    await this.assertAutomationInScope(id, actor.organizationId);
    try {
      await this.prisma.automation.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Automation ${id} not found`);
      }
      throw error;
    }
  }

  async recordRun(id: string, dto: CreateAutomationRunDto, actor: AuthenticatedUser) {
    await this.assertAutomationInScope(id, actor.organizationId);
    const automation = await this.prisma.automation.findUnique({ where: { id } });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    if (dto.status === 'NOT_RUN') {
      throw new BadRequestException(
        'A recorded run cannot have status NOT_RUN -- that value only represents no runs yet on the automation itself.',
      );
    }

    const run = await this.prisma.automationRun.create({
      data: {
        automationId: id,
        status: dto.status,
        startedAt: new Date(dto.startedAt),
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : undefined,
        notes: dto.notes,
        recordedBy: dto.recordedBy,
      },
    });

    await this.prisma.automation.update({
      where: { id },
      data: {
        lastRunStatus: run.status,
        lastRunAt: run.startedAt,
        lastRunNotes: run.notes,
      },
    });

    return run;
  }

  private async validateRelationships(
    testCaseId: string,
    environmentId: string | null | undefined,
    actorOrganizationId: string | null,
  ) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      select: {
        id: true,
        testScenario: { select: { productId: true, product: { select: { organizationId: true } } } },
      },
    });
    if (!testCase) {
      throw new BadRequestException(`Test case ${testCaseId} not found`);
    }
    assertSameOrganization(
      actorOrganizationId,
      testCase.testScenario.product.organizationId,
      `Test case ${testCaseId} not found`,
    );

    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
        select: { id: true, productId: true },
      });
      if (!environment) {
        throw new BadRequestException(`Environment ${environmentId} not found`);
      }

      if (environment.productId !== testCase.testScenario.productId) {
        throw new BadRequestException(
          `Environment ${environmentId} does not belong to the same product as the selected test case.`,
        );
      }
    }
  }
}
