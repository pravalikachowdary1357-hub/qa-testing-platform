import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type {
  ImportResult,
  ImportRowError,
} from '../common/import/import-result.interface';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.project.findMany({
      include: {
        organization: ORGANIZATION_REF_SELECT,
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        organization: ORGANIZATION_REF_SELECT,
        products: true,
        _count: { select: { products: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async create(dto: CreateProjectDto, actor?: AuthenticatedUser) {
    let created;
    try {
      created = await this.prisma.project.create({
        data: dto,
        include: {
          organization: ORGANIZATION_REF_SELECT,
          _count: { select: { products: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          `Organization ${dto.organizationId} not found`,
        );
      }
      throw error;
    }

    if (actor) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'create',
        entityType: 'Project',
        entityId: created.id,
        summary: `Created project "${created.name}"`,
      });
    }
    return created;
  }

  async update(id: string, dto: UpdateProjectDto, actor: AuthenticatedUser) {
    let updated;
    try {
      updated = await this.prisma.project.update({
        where: { id },
        data: dto,
        include: {
          organization: ORGANIZATION_REF_SELECT,
          _count: { select: { products: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Project ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new ConflictException(
            `Organization ${dto.organizationId} not found`,
          );
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'Project',
      entityId: updated.id,
      summary: `Updated project "${updated.name}"`,
    });
    return updated;
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

      const organizationName = raw['Organization Name']?.trim();
      const organization = organizationName
        ? await this.prisma.organization.findFirst({
            where: { name: { equals: organizationName, mode: 'insensitive' } },
          })
        : null;

      if (!organization) {
        errors.push({
          row: rowNumber,
          message: `Organization "${organizationName ?? ''}" not found`,
        });
        continue;
      }

      const candidate = {
        organizationId: organization.id,
        name: raw.name,
        description: raw.description,
        status: raw.status?.trim().toUpperCase() || undefined,
      };

      const result = await validateRow(CreateProjectDto, candidate);
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
          message:
            error instanceof Error ? error.message : 'Failed to create row',
        });
      }
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'import',
      entityType: 'Project',
      entityId: undefined,
      summary: `Imported ${successCount} of ${rows.length} project(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    if (project._count.products > 0) {
      throw new ConflictException(
        `This project cannot be deleted because it has ${project._count.products} product(s).`,
      );
    }

    try {
      await this.prisma.project.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This project cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'Project',
      entityId: id,
      summary: `Deleted project "${project.name}"`,
    });
  }
}
