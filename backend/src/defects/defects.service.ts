import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };

const DEFECT_INCLUDE = {
  product: { select: { id: true, name: true, organizationId: true } },
  release: RELEASE_REF_SELECT,
  environment: { select: { id: true, name: true, type: true } },
  testCase: { select: { id: true, title: true } },
  testExecution: { select: { id: true, status: true, executedAt: true } },
};

@Injectable()
export class DefectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.defect.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: DEFECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const defect = await this.prisma.defect.findUnique({
      where: { id },
      include: DEFECT_INCLUDE,
    });

    if (!defect) {
      throw new NotFoundException(`Defect ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, defect.product.organizationId, `Defect ${id} not found`);

    return defect;
  }

  async create(dto: CreateDefectDto, actor: AuthenticatedUser) {
    await this.validateRelationships(
      dto.productId,
      dto.environmentId,
      dto.testCaseId,
      dto.testExecutionId,
      actor.organizationId,
    );

    try {
      return await this.prisma.defect.create({
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
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

      let environmentId: string | undefined;
      const environmentName = raw['Environment Name']?.trim();
      if (environmentName) {
        const environment = await this.prisma.environment.findFirst({
          where: {
            productId,
            name: { equals: environmentName, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (!environment) {
          errors.push({
            row: rowNumber,
            message: `Environment "${environmentName}" not found in this product`,
          });
          continue;
        }
        environmentId = environment.id;
      }

      let testCaseId: string | undefined;
      const testCaseTitle = raw['Test Case Title']?.trim();
      if (testCaseTitle) {
        const testCase = await this.prisma.testCase.findFirst({
          where: {
            title: { equals: testCaseTitle, mode: 'insensitive' },
            testScenario: { productId },
          },
          select: { id: true },
        });
        if (!testCase) {
          errors.push({
            row: rowNumber,
            message: `Test case "${testCaseTitle}" not found in this product`,
          });
          continue;
        }
        testCaseId = testCase.id;
      }

      const candidate = {
        productId,
        environmentId,
        testCaseId,
        title: raw.title,
        description: raw.description,
        stepsToReproduce: raw.stepsToReproduce,
        expectedResult: raw.expectedResult,
        actualResult: raw.actualResult,
        severity: raw.severity?.trim().toUpperCase() || undefined,
        priority: raw.priority?.trim().toUpperCase() || undefined,
        status: raw.status?.trim().toUpperCase() || undefined,
        assignedTo: raw.assignedTo || undefined,
      };

      const result = await validateRow(CreateDefectDto, candidate);
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
          message: error instanceof Error ? error.message : 'Failed to create row',
        });
      }
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'import',
      entityType: 'Defect',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} defect(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  async update(id: string, dto: UpdateDefectDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.defect.findUnique({
      where: { id },
      include: { product: { select: { organizationId: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Defect ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Defect ${id} not found`);

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
      actor.organizationId,
    );

    try {
      return await this.prisma.defect.update({
        where: { id },
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
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

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.defect.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Defect ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Defect ${id} not found`);

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
    environmentId: string | null | undefined,
    testCaseId: string | null | undefined,
    testExecutionId: string | null | undefined,
    actorOrganizationId: string | null,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, organizationId: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    assertSameOrganization(actorOrganizationId, product.organizationId, `Product ${productId} not found`);

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
