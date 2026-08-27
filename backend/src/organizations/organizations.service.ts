import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    const organizations = await this.prisma.organization.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return organizations.map((organization) => this.toListItem(organization));
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        products: true,
        _count: { select: { products: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return {
      ...this.toListItem(organization),
      products: organization.products,
    };
  }

  async create(dto: CreateOrganizationDto) {
    try {
      return await this.prisma.organization.create({ data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `An organization named "${dto.name}" already exists.`,
        );
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
      const candidate = {
        name: raw.name,
        description: raw.description,
        status: raw.status?.trim().toUpperCase() || undefined,
      };

      const result = await validateRow(CreateOrganizationDto, candidate);
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
      entityType: 'Organization',
      entityId: undefined,
      summary: `Imported ${successCount} of ${rows.length} organization(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    try {
      return await this.prisma.organization.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Organization ${id} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `An organization named "${dto.name}" already exists.`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    if (organization._count.products > 0) {
      throw new ConflictException(
        'This organization cannot be deleted because it has products.',
      );
    }

    try {
      await this.prisma.organization.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This organization cannot be deleted because it has products.',
        );
      }
      throw error;
    }
  }

  private toListItem(organization: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    _count: { products: number };
  }) {
    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      status: organization.status,
      productCount: organization._count.products,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
