import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';

const ENVIRONMENT_INCLUDE = {
  product: { select: { id: true, name: true, organizationId: true } },
};

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.environment.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: ENVIRONMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
      include: ENVIRONMENT_INCLUDE,
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, environment.product.organizationId, `Environment ${id} not found`);

    return environment;
  }

  async create(dto: CreateEnvironmentDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    try {
      return await this.prisma.environment.create({
        data: dto,
        include: ENVIRONMENT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `An environment named "${dto.name}" already exists for this product.`,
          );
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateEnvironmentDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.environment.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Environment ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Environment ${id} not found`);

    try {
      return await this.prisma.environment.update({
        where: { id },
        data: dto,
        include: ENVIRONMENT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Environment ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `An environment named "${dto.name}" already exists for this product.`,
          );
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
      const candidate = {
        productId,
        name: raw.name,
        type: raw.type?.trim().toUpperCase() || undefined,
        status: raw.status?.trim().toUpperCase() || undefined,
        baseUrl: raw.baseUrl,
        description: raw.description,
      };

      const result = await validateRow(CreateEnvironmentDto, candidate);
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
      entityType: 'Environment',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} environment(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
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

  async remove(id: string, actor: AuthenticatedUser) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
      include: {
        _count: { select: { testExecutions: true, uatExecutions: true } },
        product: { select: { organizationId: true } },
      },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, environment.product.organizationId, `Environment ${id} not found`);

    const blockers: string[] = [];
    if (environment._count.testExecutions > 0) {
      blockers.push(`${environment._count.testExecutions} test execution(s)`);
    }
    if (environment._count.uatExecutions > 0) {
      blockers.push(`${environment._count.uatExecutions} UAT execution(s)`);
    }
    if (blockers.length > 0) {
      throw new ConflictException(
        `This environment cannot be deleted because it has ${blockers.join(' and ')}.`,
      );
    }

    try {
      await this.prisma.environment.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This environment cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }
  }
}
