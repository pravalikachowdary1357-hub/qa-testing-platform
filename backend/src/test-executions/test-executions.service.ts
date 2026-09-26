import { notifyExecutionFailure } from '../notifications/notification-events';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestExecutionDto } from './dto/create-test-execution.dto';
import { UpdateTestExecutionDto } from './dto/update-test-execution.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization } from '../common/organization-scope.util';
import { assertWorkflowTransition } from '../admin-config/admin-config.service';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };

const TEST_EXECUTION_INCLUDE = {
  testCase: {
    select: {
      id: true,
      title: true,
      expectedResult: true,
      testScenario: {
        select: {
          id: true,
          title: true,
          product: { select: { id: true, name: true, organizationId: true } },
        },
      },
    },
  },
  environment: { select: { id: true, name: true, type: true } },
  testData: { select: { id: true, name: true } },
  release: RELEASE_REF_SELECT,
};

@Injectable()
export class TestExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.testExecution.findMany({
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
      include: TEST_EXECUTION_INCLUDE,
      orderBy: { executedAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const execution = await this.prisma.testExecution.findUnique({
      where: { id },
      include: TEST_EXECUTION_INCLUDE,
    });

    if (!execution) {
      throw new NotFoundException(`Test execution ${id} not found`);
    }
    assertSameOrganization(
      actorOrganizationId,
      execution.testCase.testScenario.product.organizationId,
      `Test execution ${id} not found`,
    );

    return execution;
  }

  async create(dto: CreateTestExecutionDto, actor: AuthenticatedUser) {
    await this.validateRelationships(dto.testCaseId, dto.environmentId, dto.testDataId, actor.organizationId);

    let created;
    try {
      created = await this.prisma.testExecution.create({
        data: {
          testCaseId: dto.testCaseId,
          environmentId: dto.environmentId,
          releaseId: dto.releaseId,
          testDataId: dto.testDataId,
          status: dto.status,
          actualResult: dto.actualResult,
          notes: dto.notes,
          executedBy: dto.executedBy,
          executedAt: dto.executedAt ? new Date(dto.executedAt) : undefined,
        },
        include: TEST_EXECUTION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Test case, environment, or test data reference not found');
      }
      throw error;
    }
    await notifyExecutionFailure(this.prisma, actor, null, created);
    return created;
  }

  async update(id: string, dto: UpdateTestExecutionDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.testExecution.findUnique({
      where: { id },
      include: {
        testCase: { select: { testScenario: { select: { product: { select: { organizationId: true } } } } } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Test execution ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existing.testCase.testScenario.product.organizationId,
      `Test execution ${id} not found`,
    );

    const effectiveTestCaseId = dto.testCaseId ?? existing.testCaseId;
    const effectiveEnvironmentId = dto.environmentId ?? existing.environmentId;
    const effectiveTestDataId =
      dto.testDataId !== undefined ? dto.testDataId : existing.testDataId;

    await this.validateRelationships(
      effectiveTestCaseId,
      effectiveEnvironmentId,
      effectiveTestDataId,
      actor.organizationId,
    );

    await assertWorkflowTransition(
      this.prisma,
      'TEST_EXECUTION',
      existing.status,
      dto.status,
    );

    let updated;
    try {
      updated = await this.prisma.testExecution.update({
        where: { id },
        data: {
          testCaseId: dto.testCaseId,
          environmentId: dto.environmentId,
          releaseId: dto.releaseId,
          testDataId: dto.testDataId,
          status: dto.status,
          actualResult: dto.actualResult,
          notes: dto.notes,
          executedBy: dto.executedBy,
          executedAt: dto.executedAt ? new Date(dto.executedAt) : undefined,
        },
        include: TEST_EXECUTION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test execution ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Test case, environment, or test data reference not found');
        }
      }
      throw error;
    }
    await notifyExecutionFailure(this.prisma, actor, existing, updated);
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.testExecution.findUnique({
      where: { id },
      select: {
        testCase: { select: { testScenario: { select: { product: { select: { organizationId: true } } } } } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Test execution ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existing.testCase.testScenario.product.organizationId,
      `Test execution ${id} not found`,
    );

    try {
      await this.prisma.testExecution.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Test execution ${id} not found`);
      }
      throw error;
    }
  }

  private async validateRelationships(
    testCaseId: string,
    environmentId: string,
    testDataId: string | null | undefined,
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

    if (testDataId) {
      const testData = await this.prisma.testData.findUnique({
        where: { id: testDataId },
        select: { id: true, testCaseId: true },
      });
      if (!testData) {
        throw new BadRequestException(`Test data ${testDataId} not found`);
      }
      if (testData.testCaseId && testData.testCaseId !== testCaseId) {
        throw new BadRequestException(
          `Test data ${testDataId} is linked to a different test case and cannot be used here.`,
        );
      }
    }
  }
}
