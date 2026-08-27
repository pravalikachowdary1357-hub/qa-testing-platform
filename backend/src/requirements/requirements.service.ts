import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';

const PRODUCT_REF_SELECT = { select: { id: true, name: true } };
const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };
const REQUIREMENT_INCLUDE = { product: PRODUCT_REF_SELECT, release: RELEASE_REF_SELECT };

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId?: string) {
    return this.prisma.requirement.findMany({
      where: productId ? { productId } : {},
      include: REQUIREMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      include: REQUIREMENT_INCLUDE,
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    return requirement;
  }

  async create(dto: CreateRequirementDto) {
    try {
      return await this.prisma.requirement.create({
        data: dto,
        include: REQUIREMENT_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRequirementDto) {
    try {
      return await this.prisma.requirement.update({
        where: { id },
        data: dto,
        include: REQUIREMENT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Requirement ${id} not found`);
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
      const candidate = {
        productId,
        title: raw.title,
        description: raw.description,
        type: raw.type?.trim().toUpperCase() || undefined,
        priority: raw.priority?.trim().toUpperCase() || undefined,
        status: raw.status?.trim().toUpperCase() || undefined,
      };

      const result = await validateRow(CreateRequirementDto, candidate);
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
      entityType: 'Requirement',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} requirement(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  async remove(id: string) {
    try {
      await this.prisma.requirement.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Requirement ${id} not found`);
      }
      throw error;
    }
  }
}
