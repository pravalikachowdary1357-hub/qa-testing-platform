import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization, organizationScopeWhere } from '../common/organization-scope.util';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };

@Injectable()
export class BusinessUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(organizationId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.businessUnit.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...organizationScopeWhere(actorOrganizationId),
      },
      include: {
        organization: ORGANIZATION_REF_SELECT,
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id },
      include: {
        organization: ORGANIZATION_REF_SELECT,
        projects: true,
        _count: { select: { projects: true } },
      },
    });

    if (!businessUnit) {
      throw new NotFoundException(`Business unit ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, businessUnit.organizationId, `Business unit ${id} not found`);

    return businessUnit;
  }

  async create(dto: CreateBusinessUnitDto, actor: AuthenticatedUser) {
    // dto.organizationId IS the parent here (there's no intermediate entity
    // to resolve it from) -- a scoped actor may only create a business unit
    // in their own organization.
    assertSameOrganization(actor.organizationId, dto.organizationId, `Organization ${dto.organizationId} not found`);

    let created;
    try {
      created = await this.prisma.businessUnit.create({
        data: dto,
        include: {
          organization: ORGANIZATION_REF_SELECT,
          _count: { select: { projects: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(`Organization ${dto.organizationId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A business unit named "${dto.name}" already exists in this organization.`,
          );
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'BusinessUnit',
      entityId: created.id,
      summary: `Created business unit "${created.name}"`,
    });
    return created;
  }

  async update(id: string, dto: UpdateBusinessUnitDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.businessUnit.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Business unit ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.organizationId, `Business unit ${id} not found`);
    // Reassignment guard: a scoped actor editing their own business unit
    // still can't move it into a DIFFERENT organization by supplying a
    // foreign organizationId in the update body.
    if (dto.organizationId) {
      assertSameOrganization(
        actor.organizationId,
        dto.organizationId,
        `Organization ${dto.organizationId} not found`,
      );
    }

    let updated;
    try {
      updated = await this.prisma.businessUnit.update({
        where: { id },
        data: dto,
        include: {
          organization: ORGANIZATION_REF_SELECT,
          _count: { select: { projects: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Business unit ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new ConflictException(`Organization ${dto.organizationId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A business unit named "${dto.name}" already exists in this organization.`,
          );
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'BusinessUnit',
      entityId: updated.id,
      summary: `Updated business unit "${updated.name}"`,
    });
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const businessUnit = await this.prisma.businessUnit.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });

    if (!businessUnit) {
      throw new NotFoundException(`Business unit ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, businessUnit.organizationId, `Business unit ${id} not found`);

    if (businessUnit._count.projects > 0) {
      throw new ConflictException(
        `This business unit cannot be deleted because it has ${businessUnit._count.projects} project(s).`,
      );
    }

    try {
      await this.prisma.businessUnit.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This business unit cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'BusinessUnit',
      entityId: id,
      summary: `Deleted business unit "${businessUnit.name}"`,
    });
  }
}
