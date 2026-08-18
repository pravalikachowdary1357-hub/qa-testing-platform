import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';

const TEST_CASE_INCLUDE = {
  testScenario: { select: { id: true, title: true } },
  steps: { orderBy: { stepNumber: 'asc' as const } },
};

@Injectable()
export class TestCasesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId?: string) {
    return this.prisma.testCase.findMany({
      where: productId ? { testScenario: { productId } } : {},
      include: TEST_CASE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      include: TEST_CASE_INCLUDE,
    });

    if (!testCase) {
      throw new NotFoundException(`Test case ${id} not found`);
    }

    return testCase;
  }

  async create(dto: CreateTestCaseDto) {
    const { testScenarioId, title, description, preconditions, expectedResult, priority, status, steps } =
      dto;

    try {
      return await this.prisma.testCase.create({
        data: {
          testScenarioId,
          title,
          description,
          preconditions,
          expectedResult,
          priority,
          status,
          steps: {
            create: steps.map((step, index) => ({
              stepNumber: index + 1,
              action: step.action,
              expectedResult: step.expectedResult,
            })),
          },
        },
        include: TEST_CASE_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Test scenario ${dto.testScenarioId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    const existing = await this.prisma.testCase.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Test case ${id} not found`);
    }

    const { testScenarioId, title, description, preconditions, expectedResult, priority, status, steps } =
      dto;

    try {
      return await this.prisma.testCase.update({
        where: { id },
        data: {
          testScenarioId,
          title,
          description,
          preconditions,
          expectedResult,
          priority,
          status,
          ...(steps !== undefined
            ? {
                steps: {
                  deleteMany: {},
                  create: steps.map((step, index) => ({
                    stepNumber: index + 1,
                    action: step.action,
                    expectedResult: step.expectedResult,
                  })),
                },
              }
            : {}),
        },
        include: TEST_CASE_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test case ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Test scenario ${dto.testScenarioId} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      include: {
        _count: { select: { testExecutions: true, automations: true, securityTests: true } },
      },
    });

    if (!testCase) {
      throw new NotFoundException(`Test case ${id} not found`);
    }

    const blockers: string[] = [];
    if (testCase._count.testExecutions > 0) {
      blockers.push(`${testCase._count.testExecutions} test execution(s)`);
    }
    if (testCase._count.automations > 0) {
      blockers.push(`${testCase._count.automations} automation(s)`);
    }
    if (testCase._count.securityTests > 0) {
      blockers.push(`${testCase._count.securityTests} security test(s)`);
    }
    if (blockers.length > 0) {
      throw new ConflictException(
        `This test case cannot be deleted because it has ${blockers.join(' and ')}.`,
      );
    }

    try {
      await this.prisma.testCase.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException('This test case cannot be deleted because it has dependent records.');
      }
      throw error;
    }
  }
}
