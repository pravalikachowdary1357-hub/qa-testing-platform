import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization, organizationScopeWhere } from '../common/organization-scope.util';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };
const USER_REF_SELECT = { select: { id: true, name: true, email: true, status: true } };
const TEAM_INCLUDE = {
  organization: ORGANIZATION_REF_SELECT,
  _count: { select: { members: true } },
};
const TEAM_DETAIL_INCLUDE = {
  organization: ORGANIZATION_REF_SELECT,
  members: { include: { user: USER_REF_SELECT }, orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(organizationId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.team.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...organizationScopeWhere(actorOrganizationId),
      },
      include: TEAM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: TEAM_DETAIL_INCLUDE,
    });

    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, team.organizationId, `Team ${id} not found`);

    return team;
  }

  async create(dto: CreateTeamDto, actor: AuthenticatedUser) {
    // dto.organizationId IS the parent here (there's no intermediate entity
    // to resolve it from) -- a scoped actor may only create a team in their
    // own organization.
    assertSameOrganization(actor.organizationId, dto.organizationId, `Organization ${dto.organizationId} not found`);

    let created;
    try {
      created = await this.prisma.team.create({ data: dto, include: TEAM_INCLUDE });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(`Organization ${dto.organizationId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A team named "${dto.name}" already exists in this organization.`,
          );
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'Team',
      entityId: created.id,
      summary: `Created team "${created.name}"`,
    });
    return created;
  }

  async update(id: string, dto: UpdateTeamDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.team.findUnique({ where: { id }, select: { organizationId: true } });
    if (!existing) {
      throw new NotFoundException(`Team ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.organizationId, `Team ${id} not found`);
    // No reassignment guard needed here: UpdateTeamDto has no organizationId
    // field at all (only name/description are editable), so a team can't be
    // moved to a different organization through this endpoint by construction.

    let updated;
    try {
      updated = await this.prisma.team.update({
        where: { id },
        data: dto,
        include: TEAM_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Team ${id} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `A team named "${dto.name}" already exists in this organization.`,
          );
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'Team',
      entityId: updated.id,
      summary: `Updated team "${updated.name}"`,
    });
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, team.organizationId, `Team ${id} not found`);

    // Memberships cascade with the team (TeamMember.onDelete: Cascade) --
    // a membership is meaningless without its team, unlike Project/Product
    // rows under a BusinessUnit/Organization, which are independently
    // valuable and therefore blocked from cascading away.
    await this.prisma.team.delete({ where: { id } });

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'Team',
      entityId: id,
      summary: `Deleted team "${team.name}"`,
    });
  }

  async addMember(teamId: string, dto: AddTeamMemberDto, actor: AuthenticatedUser) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }
    assertSameOrganization(actor.organizationId, team.organizationId, `Team ${teamId} not found`);

    // A team's roster must stay within its own organization -- checked
    // against the team's organization directly (not the actor's), so this
    // also holds for an unscoped actor administering multiple organizations.
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { organizationId: true },
    });
    if (!user) {
      throw new ConflictException(`User ${dto.userId} not found`);
    }
    if (user.organizationId !== team.organizationId) {
      throw new BadRequestException(
        `User ${dto.userId} does not belong to this team's organization.`,
      );
    }

    let member;
    try {
      member = await this.prisma.teamMember.create({
        data: { teamId, userId: dto.userId, responsibility: dto.responsibility },
        include: { user: USER_REF_SELECT },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('This user is already on the team.');
        }
        if (error.code === 'P2003') {
          throw new ConflictException(`User ${dto.userId} not found`);
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'team.member_added',
      entityType: 'Team',
      entityId: teamId,
      summary: `Added ${member.user.name} to team "${team.name}"`,
    });
    return member;
  }

  async removeMember(teamId: string, memberId: string, actor: AuthenticatedUser) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: USER_REF_SELECT, team: true },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundException(`Team member ${memberId} not found`);
    }
    assertSameOrganization(actor.organizationId, member.team.organizationId, `Team member ${memberId} not found`);

    await this.prisma.teamMember.delete({ where: { id: memberId } });

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'team.member_removed',
      entityType: 'Team',
      entityId: teamId,
      summary: `Removed ${member.user.name} from team "${member.team.name}"`,
    });
  }
}
