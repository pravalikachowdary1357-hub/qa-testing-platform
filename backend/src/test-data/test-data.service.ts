import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestDataDto } from './dto/create-test-data.dto';
import { UpdateTestDataDto } from './dto/update-test-data.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';
import { assertSameOrganization } from '../common/organization-scope.util';

const TEST_CASE_REF = { select: { id: true, title: true } };

// The `value` column can hold sensitive-looking content (credentials, tokens),
// so the list endpoint deliberately omits it -- only the single-record detail
// endpoint (findOne) returns it.
const LIST_SELECT = {
  id: true,
  testCaseId: true,
  name: true,
  description: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  testCase: TEST_CASE_REF,
};

@Injectable()
export class TestDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.testData.findMany({
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
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const record = await this.prisma.testData.findUnique({
      where: { id },
      include: {
        testCase: {
          select: {
            id: true,
            title: true,
            testScenario: { select: { product: { select: { organizationId: true } } } },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Test data ${id} not found`);
    }
    // Test data isn't required to be linked to a test case -- when it isn't,
    // there's no organization to check against, so a scoped actor can't see
    // it (matches how the same "no linked test case" filter naturally
    // excludes it from findAll's where clause above).
    assertSameOrganization(
      actorOrganizationId,
      record.testCase?.testScenario.product.organizationId ?? null,
      `Test data ${id} not found`,
    );

    return record;
  }

  async create(dto: CreateTestDataDto, actor: AuthenticatedUser) {
    if (dto.testCaseId) {
      await this.assertTestCaseInScope(dto.testCaseId, actor.organizationId);
    }
    try {
      return await this.prisma.testData.create({
        data: dto,
        include: { testCase: TEST_CASE_REF },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Test case ${dto.testCaseId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTestDataDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.testData.findUnique({
      where: { id },
      select: {
        testCase: { select: { testScenario: { select: { product: { select: { organizationId: true } } } } } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Test data ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existing.testCase?.testScenario.product.organizationId ?? null,
      `Test data ${id} not found`,
    );

    try {
      return await this.prisma.testData.update({
        where: { id },
        data: dto,
        include: { testCase: TEST_CASE_REF },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test data ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Test case ${dto.testCaseId} not found`);
        }
      }
      throw error;
    }
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

      const testCaseTitle = raw['Test Case Title']?.trim();
      let testCaseId: string | undefined;
      if (testCaseTitle) {
        const matches = await this.prisma.testCase.findMany({
          where: { title: { equals: testCaseTitle, mode: 'insensitive' } },
          select: { id: true },
        });
        if (matches.length === 0) {
          errors.push({
            row: rowNumber,
            message: `Test case "${testCaseTitle}" not found`,
          });
          continue;
        }
        if (matches.length > 1) {
          errors.push({
            row: rowNumber,
            message: `Multiple test cases titled "${testCaseTitle}" found; link this test data manually instead`,
          });
          continue;
        }
        testCaseId = matches[0].id;
      }

      const candidate = {
        testCaseId,
        name: raw.name,
        description: raw.description,
        type: raw.type?.trim().toUpperCase() || undefined,
        value: raw.value,
      };

      const result = await validateRow(CreateTestDataDto, candidate);
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
      entityType: 'TestData',
      entityId: undefined,
      summary: `Imported ${successCount} of ${rows.length} testdata(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  private async assertTestCaseInScope(testCaseId: string, actorOrganizationId: string | null): Promise<void> {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
      select: { testScenario: { select: { product: { select: { organizationId: true } } } } },
    });
    if (!testCase) {
      throw new BadRequestException(`Test case ${testCaseId} not found`);
    }
    assertSameOrganization(
      actorOrganizationId,
      testCase.testScenario.product.organizationId,
      `Test case ${testCaseId} not found`,
    );
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.testData.findUnique({
      where: { id },
      select: {
        testCase: { select: { testScenario: { select: { product: { select: { organizationId: true } } } } } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Test data ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existing.testCase?.testScenario.product.organizationId ?? null,
      `Test data ${id} not found`,
    );

    try {
      await this.prisma.testData.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Test data ${id} not found`);
      }
      throw error;
    }
  }
}
