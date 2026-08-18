import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';

const DEFECT_INCLUDE = {
  product: { select: { id: true, name: true } },
  environment: { select: { id: true, name: true, type: true } },
  testCase: { select: { id: true, title: true } },
  testExecution: { select: { id: true, status: true, executedAt: true } },
};

@Injectable()
export class DefectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId?: string) {
    return this.prisma.defect.findMany({
      where: productId ? { productId } : {},
      include: DEFECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const defect = await this.prisma.defect.findUnique({
      where: { id },
      include: DEFECT_INCLUDE,
    });

    if (!defect) {
      throw new NotFoundException(`Defect ${id} not found`);
    }

    return defect;
  }

  async create(dto: CreateDefectDto) {
    await this.validateRelationships(
      dto.productId,
      dto.environmentId,
      dto.testCaseId,
      dto.testExecutionId,
    );

    try {
      return await this.prisma.defect.create({
        data: {
          productId: dto.productId,
          environmentId: dto.environmentId,
          testCaseId: dto.testCaseId,
          testExecutionId: dto.testExecutionId,
          title: dto.title,
          description: dto.description,
          stepsToReproduce: dto.stepsToReproduce,
          expectedResult: dto.expectedResult,
          actualResult: dto.actualResult,
          severity: dto.severity,
          priority: dto.priority,
          status: dto.status,
          assignedTo: dto.assignedTo,
        },
        include: DEFECT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('One or more referenced records were not found');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateDefectDto) {
    const existing = await this.prisma.defect.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Defect ${id} not found`);
    }

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveEnvironmentId =
      dto.environmentId !== undefined ? dto.environmentId : existing.environmentId;
    const effectiveTestCaseId = dto.testCaseId !== undefined ? dto.testCaseId : existing.testCaseId;
    const effectiveTestExecutionId =
      dto.testExecutionId !== undefined ? dto.testExecutionId : existing.testExecutionId;

    await this.validateRelationships(
      effectiveProductId,
      effectiveEnvironmentId,
      effectiveTestCaseId,
      effectiveTestExecutionId,
    );

    try {
      return await this.prisma.defect.update({
        where: { id },
        data: {
          productId: dto.productId,
          environmentId: dto.environmentId,
          testCaseId: dto.testCaseId,
          testExecutionId: dto.testExecutionId,
          title: dto.title,
          description: dto.description,
          stepsToReproduce: dto.stepsToReproduce,
          expectedResult: dto.expectedResult,
          actualResult: dto.actualResult,
          severity: dto.severity,
          priority: dto.priority,
          status: dto.status,
          assignedTo: dto.assignedTo,
        },
        include: DEFECT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Defect ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('One or more referenced records were not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.defect.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Defect ${id} not found`);
      }
      throw error;
    }
  }

  private async validateRelationships(
    productId: string,
    environmentId?: string | null,
    testCaseId?: string | null,
    testExecutionId?: string | null,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }

    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
        select: { id: true, productId: true },
      });
      if (!environment) {
        throw new BadRequestException(`Environment ${environmentId} not found`);
      }
      if (environment.productId !== productId) {
        throw new BadRequestException(
          `Environment ${environmentId} does not belong to the selected product.`,
        );
      }
    }

    if (testCaseId) {
      const testCase = await this.prisma.testCase.findUnique({
        where: { id: testCaseId },
        select: { id: true, testScenario: { select: { productId: true } } },
      });
      if (!testCase) {
        throw new BadRequestException(`Test case ${testCaseId} not found`);
      }
      if (testCase.testScenario.productId !== productId) {
        throw new BadRequestException(
          `Test case ${testCaseId} does not belong to the selected product.`,
        );
      }
    }

    if (testExecutionId) {
      const testExecution = await this.prisma.testExecution.findUnique({
        where: { id: testExecutionId },
        select: {
          id: true,
          testCaseId: true,
          environmentId: true,
          testCase: { select: { testScenario: { select: { productId: true } } } },
        },
      });
      if (!testExecution) {
        throw new BadRequestException(`Test execution ${testExecutionId} not found`);
      }
      if (testExecution.testCase.testScenario.productId !== productId) {
        throw new BadRequestException(
          `Test execution ${testExecutionId} does not belong to the selected product.`,
        );
      }
      if (testCaseId && testExecution.testCaseId !== testCaseId) {
        throw new BadRequestException(
          `Test execution ${testExecutionId} does not belong to the selected test case.`,
        );
      }
    }
  }
}
