import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestExecutionDto } from './dto/create-test-execution.dto';
import { UpdateTestExecutionDto } from './dto/update-test-execution.dto';

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
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
  environment: { select: { id: true, name: true, type: true } },
  testData: { select: { id: true, name: true } },
};

@Injectable()
export class TestExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.testExecution.findMany({
      include: TEST_EXECUTION_INCLUDE,
      orderBy: { executedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const execution = await this.prisma.testExecution.findUnique({
      where: { id },
      include: TEST_EXECUTION_INCLUDE,
    });

    if (!execution) {
      throw new NotFoundException(`Test execution ${id} not found`);
    }

    return execution;
  }

  async create(dto: CreateTestExecutionDto) {
    await this.validateRelationships(dto.testCaseId, dto.environmentId, dto.testDataId);

    try {
      return await this.prisma.testExecution.create({
        data: {
          testCaseId: dto.testCaseId,
          environmentId: dto.environmentId,
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
  }

  async update(id: string, dto: UpdateTestExecutionDto) {
    const existing = await this.prisma.testExecution.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Test execution ${id} not found`);
    }

    const effectiveTestCaseId = dto.testCaseId ?? existing.testCaseId;
    const effectiveEnvironmentId = dto.environmentId ?? existing.environmentId;
    const effectiveTestDataId =
      dto.testDataId !== undefined ? dto.testDataId : existing.testDataId;

    await this.validateRelationships(effectiveTestCaseId, effectiveEnvironmentId, effectiveTestDataId);

    try {
      return await this.prisma.testExecution.update({
        where: { id },
        data: {
          testCaseId: dto.testCaseId,
          environmentId: dto.environmentId,
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
  }

  async remove(id: string) {
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
    testDataId?: string | null,
  ) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      select: { id: true, testScenario: { select: { productId: true } } },
    });
    if (!testCase) {
      throw new BadRequestException(`Test case ${testCaseId} not found`);
    }

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
