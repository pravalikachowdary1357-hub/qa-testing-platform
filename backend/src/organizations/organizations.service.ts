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
import { assertSameOrganization } from '../common/organization-scope.util';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // A scoped actor only ever belongs to one organization, so it's the only
  // one they should ever see in this list -- an unscoped actor (no
  // organization assigned) keeps seeing every organization, same as every
  // other org-scoped list in this app.
  async findAll(actorOrganizationId: string | null) {
    const organizations = await this.prisma.organization.findMany({
      where: actorOrganizationId ? { id: actorOrganizationId } : {},
      include: {
        _count: { select: { products: true, businessUnits: true, projects: true, teams: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return organizations.map((organization) => this.toListItem(organization));
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        products: true,
        _count: { select: { products: true, businessUnits: true, projects: true, teams: true, users: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, organization.id, `Organization ${id} not found`);

    return {
      ...this.toListItem(organization),
      products: organization.products,
    };
  }

  async create(dto: CreateOrganizationDto, actor?: AuthenticatedUser) {
    let created;
    try {
      created = await this.prisma.organization.create({ data: dto });
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

    if (actor) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'create',
        entityType: 'Organization',
        entityId: created.id,
        summary: `Created organization "${created.name}"`,
      });
    }
    return created;
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

  async update(id: string, dto: UpdateOrganizationDto, actor: AuthenticatedUser) {
    assertSameOrganization(actor.organizationId, id, `Organization ${id} not found`);

    let updated;
    try {
      updated = await this.prisma.organization.update({
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

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'Organization',
      entityId: updated.id,
      summary: `Updated organization "${updated.name}"`,
    });
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, businessUnits: true, projects: true, teams: true, users: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, id, `Organization ${id} not found`);

    // Users are intentionally not a blocker here: User.organizationId uses
    // onDelete: SetNull (same convention as Product.productOwnerId), so
    // deleting an organization safely unassigns its users rather than
    // losing any data -- only Restrict relations (products/projects/
    // business units/teams) block deletion.
    const blockers: string[] = [];
    if (organization._count.products > 0) blockers.push(`${organization._count.products} product(s)`);
    if (organization._count.projects > 0) blockers.push(`${organization._count.projects} project(s)`);
    if (organization._count.businessUnits > 0) blockers.push(`${organization._count.businessUnits} business unit(s)`);
    if (organization._count.teams > 0) blockers.push(`${organization._count.teams} team(s)`);
    if (blockers.length > 0) {
      throw new ConflictException(
        `This organization cannot be deleted because it has ${blockers.join(', ')}.`,
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
          'This organization cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'Organization',
      entityId: id,
      summary: `Deleted organization "${organization.name}"`,
    });
  }

  private toListItem(organization: {
    id: string;
    name: string;
    orgKey: string | null;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    _count: { products: number; businessUnits: number; projects: number; teams: number; users: number };
  }) {
    return {
      id: organization.id,
      name: organization.name,
      orgKey: organization.orgKey,
      description: organization.description,
      status: organization.status,
      productCount: organization._count.products,
      projectCount: organization._count.projects,
      businessUnitCount: organization._count.businessUnits,
      teamCount: organization._count.teams,
      userCount: organization._count.users,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
