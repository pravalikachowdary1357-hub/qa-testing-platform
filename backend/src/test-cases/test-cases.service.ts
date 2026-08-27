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
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };
const TEST_CASE_INCLUDE = {
  testScenario: { select: { id: true, title: true } },
  release: RELEASE_REF_SELECT,
  steps: { orderBy: { stepNumber: 'asc' as const } },
};

@Injectable()
export class TestCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

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
    const { testScenarioId, releaseId, title, description, preconditions, expectedResult, priority, status, steps } =
      dto;

    try {
      return await this.prisma.testCase.create({
        data: {
          testScenarioId,
          releaseId,
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

    const { testScenarioId, releaseId, title, description, preconditions, expectedResult, priority, status, steps } =
      dto;

    try {
      return await this.prisma.testCase.update({
        where: { id },
        data: {
          testScenarioId,
          releaseId,
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

      const scenarioTitle = raw['Test Scenario Title']?.trim();
      if (!scenarioTitle) {
        errors.push({ row: rowNumber, message: 'Test Scenario Title is required' });
        continue;
      }

      const scenario = await this.prisma.testScenario.findFirst({
        where: {
          productId,
          title: { equals: scenarioTitle, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (!scenario) {
        errors.push({
          row: rowNumber,
          message: `Test scenario "${scenarioTitle}" not found in this product`,
        });
        continue;
      }

      // Step-by-step sub-rows aren't representable in a flat CSV; every
      // imported row gets one default step derived from its own expected
      // result so create() (which requires at least one step) can be reused
      // unmodified. Finer-grained steps stay a manual post-import edit.
      const candidate = {
        testScenarioId: scenario.id,
        title: raw.title,
        description: raw.description,
        preconditions: raw.preconditions || undefined,
        expectedResult: raw.expectedResult,
        priority: raw.priority?.trim().toUpperCase() || undefined,
        status: raw.status?.trim().toUpperCase() || undefined,
        steps: [
          {
            action: 'Execute the test case as described.',
            expectedResult: raw.expectedResult,
          },
        ],
      };

      const result = await validateRow(CreateTestCaseDto, candidate);
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
      entityType: 'TestCase',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} testcase(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
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
