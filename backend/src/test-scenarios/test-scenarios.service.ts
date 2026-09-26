import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestScenarioDto } from './dto/create-test-scenario.dto';
import { UpdateTestScenarioDto } from './dto/update-test-scenario.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';
import { assertWorkflowTransition } from '../admin-config/admin-config.service';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };

const TEST_SCENARIO_INCLUDE = {
  product: { select: { id: true, name: true, organizationId: true } },
  release: RELEASE_REF_SELECT,
  requirement: { select: { id: true, title: true } },
};

@Injectable()
export class TestScenariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.testScenario.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: TEST_SCENARIO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: TEST_SCENARIO_INCLUDE,
    });

    if (!scenario) {
      throw new NotFoundException(`Test scenario ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, scenario.product.organizationId, `Test scenario ${id} not found`);

    return scenario;
  }

  async create(dto: CreateTestScenarioDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    if (dto.requirementId) {
      await this.validateRequirementBelongsToProduct(dto.requirementId, dto.productId);
    }

    try {
      return await this.prisma.testScenario.create({
        data: dto,
        include: TEST_SCENARIO_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTestScenarioDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { product: { select: { organizationId: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Test scenario ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Test scenario ${id} not found`);

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveRequirementId =
      dto.requirementId !== undefined ? dto.requirementId : existing.requirementId;

    if (effectiveRequirementId) {
      await this.validateRequirementBelongsToProduct(effectiveRequirementId, effectiveProductId);
    }

    await assertWorkflowTransition(
      this.prisma,
      'TEST_SCENARIO',
      existing.status,
      dto.status,
    );

    try {
      return await this.prisma.testScenario.update({
        where: { id },
        data: dto,
        include: TEST_SCENARIO_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test scenario ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
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

      const requirementTitle = raw['Requirement Title']?.trim();
      let requirementId: string | undefined;
      if (requirementTitle) {
        const requirement = await this.prisma.requirement.findFirst({
          where: {
            productId,
            title: { equals: requirementTitle, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (!requirement) {
          errors.push({
            row: rowNumber,
            message: `Requirement "${requirementTitle}" not found in this product`,
          });
          continue;
        }
        requirementId = requirement.id;
      }

      const candidate = {
        productId,
        requirementId,
        title: raw.title,
        description: raw.description,
        type: raw.type?.trim().toUpperCase() || undefined,
        priority: raw.priority?.trim().toUpperCase() || undefined,
        status: raw.status?.trim().toUpperCase() || undefined,
      };

      const result = await validateRow(CreateTestScenarioDto, candidate);
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
      entityType: 'TestScenario',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} testscenario(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: {
        _count: { select: { testCases: true } },
        product: { select: { organizationId: true } },
      },
    });

    if (!scenario) {
      throw new NotFoundException(`Test scenario ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, scenario.product.organizationId, `Test scenario ${id} not found`);

    if (scenario._count.testCases > 0) {
      throw new ConflictException(
        `This test scenario cannot be deleted because it has ${scenario._count.testCases} test case(s).`,
      );
    }

    try {
      await this.prisma.testScenario.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This test scenario cannot be deleted because it has dependent records.',
        );
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
        `Requirement ${requirementId} does not belong to the selected product.`,
      );
    }
  }
}
