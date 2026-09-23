import {
  BadRequestException,
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
import { assertSameOrganization, organizationScopeWhere } from '../common/organization-scope.util';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };
const BUSINESS_UNIT_REF_SELECT = { select: { id: true, name: true } };
const PROJECT_INCLUDE = {
  organization: ORGANIZATION_REF_SELECT,
  businessUnit: BUSINESS_UNIT_REF_SELECT,
  _count: { select: { products: true } },
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(actorOrganizationId: string | null) {
    return this.prisma.project.findMany({
      where: organizationScopeWhere(actorOrganizationId),
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { ...PROJECT_INCLUDE, products: true },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, project.organizationId, `Project ${id} not found`);

    return project;
  }

  // A Project's Business Unit, if set, must belong to the same Organization
  // as the Project itself -- otherwise the Organization -> Business Unit ->
  // Project hierarchy silently breaks (a real, previously-unchecked gap on
  // the Product/Project pairing this mirrors).
  private async assertBusinessUnitBelongsToOrganization(
    businessUnitId: string,
    organizationId: string,
  ) {
    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id: businessUnitId },
      select: { organizationId: true },
    });
    if (!businessUnit) {
      throw new BadRequestException(`Business unit ${businessUnitId} not found`);
    }
    if (businessUnit.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected business unit does not belong to this organization.',
      );
    }
  }

  async create(dto: CreateProjectDto, actor?: AuthenticatedUser) {
    if (actor) {
      assertSameOrganization(
        actor.organizationId,
        dto.organizationId,
        `Organization ${dto.organizationId} not found`,
      );
    }
    if (dto.businessUnitId) {
      await this.assertBusinessUnitBelongsToOrganization(dto.businessUnitId, dto.organizationId);
    }

    let created;
    try {
      created = await this.prisma.project.create({
        data: dto,
        include: PROJECT_INCLUDE,
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
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.organizationId, `Project ${id} not found`);
    // Reassignment guard: a scoped actor editing their own project still
    // can't move it into a DIFFERENT organization by supplying a foreign
    // organizationId in the update body.
    if (dto.organizationId) {
      assertSameOrganization(
        actor.organizationId,
        dto.organizationId,
        `Organization ${dto.organizationId} not found`,
      );
    }

    if (dto.businessUnitId || dto.organizationId) {
      const effectiveOrganizationId = dto.organizationId ?? existing.organizationId;
      if (dto.businessUnitId) {
        await this.assertBusinessUnitBelongsToOrganization(dto.businessUnitId, effectiveOrganizationId);
      }
    }

    let updated;
    try {
      updated = await this.prisma.project.update({
        where: { id },
        data: dto,
        include: PROJECT_INCLUDE,
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
        await this.create(result.dto, actor);
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
    assertSameOrganization(actor.organizationId, project.organizationId, `Project ${id} not found`);

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
