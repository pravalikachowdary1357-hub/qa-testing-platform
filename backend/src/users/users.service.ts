import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { hashPassword } from '../auth/password.util';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization } from '../common/organization-scope.util';

const USER_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;
const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };
const USER_INCLUDE = {
  role: { select: { id: true, name: true } },
  organization: ORGANIZATION_REF_SELECT,
};

function validateStatusParam(value: string | undefined) {
  if (value === undefined) return undefined;
  if (!USER_STATUS_VALUES.includes(value as (typeof USER_STATUS_VALUES)[number])) {
    throw new BadRequestException(
      `Invalid status '${value}'. Expected one of: ${USER_STATUS_VALUES.join(', ')}.`,
    );
  }
  return value as (typeof USER_STATUS_VALUES)[number];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(query: ListUsersQueryDto, actorOrganizationId: string | null) {
    const status = validateStatusParam(query.status);
    const users = await this.prisma.user.findMany({
      where: {
        roleId: query.roleId,
        status,
        // A scoped actor can never widen this past their own organization,
        // even if they pass a different organizationId in the query.
        organizationId: actorOrganizationId ?? query.organizationId,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: USER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toListItem(user));
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const user = await this.getUserOr404(id);
    assertSameOrganization(actorOrganizationId, user.organizationId, `User ${id} not found`);
    return this.toListItem(user);
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    await this.getRoleOr404(dto.roleId);
    if (dto.organizationId) {
      await this.getOrganizationOr404(dto.organizationId);
      // A scoped actor may only create a user in their own organization,
      // even though the DTO field is a plain organizationId.
      assertSameOrganization(
        actor.organizationId,
        dto.organizationId,
        `Organization ${dto.organizationId} not found`,
      );
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash: await hashPassword(dto.password),
          roleId: dto.roleId,
          organizationId: dto.organizationId,
        },
        include: USER_INCLUDE,
      });
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'user.created',
        entityType: 'User',
        entityId: user.id,
        summary: `Created user ${user.email} with role ${user.role.name}.`,
      });
      return this.toListItem(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A user with email "${dto.email}" already exists.`,
        );
      }
      throw error;
    }
  }

  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: USER_INCLUDE,
    });
    return this.toListItem(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot change your own role.');
    }
    const existing = await this.getUserOr404(id);
    assertSameOrganization(actor.organizationId, existing.organizationId, `User ${id} not found`);
    if (dto.roleId) {
      await this.getRoleOr404(dto.roleId);
    }
    if (dto.organizationId) {
      await this.getOrganizationOr404(dto.organizationId);
      // Reassignment guard: a scoped actor editing a user in their own
      // organization still can't move that user into a DIFFERENT
      // organization by supplying a foreign organizationId in the update.
      assertSameOrganization(
        actor.organizationId,
        dto.organizationId,
        `Organization ${dto.organizationId} not found`,
      );
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: USER_INCLUDE,
    });

    if (dto.roleId && dto.roleId !== existing.roleId) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'user.role_changed',
        entityType: 'User',
        entityId: user.id,
        summary: `Changed ${user.email}'s role from ${existing.role.name} to ${user.role.name}.`,
      });
    }
    if (dto.organizationId !== undefined && dto.organizationId !== existing.organizationId) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'user.organization_changed',
        entityType: 'User',
        entityId: user.id,
        summary: `Changed ${user.email}'s organization to ${user.organization?.name ?? 'none'}.`,
      });
    }
    return this.toListItem(user);
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
  ) {
    if (id === actor.id) {
      throw new ForbiddenException(
        'You cannot activate or deactivate your own account.',
      );
    }
    const existing = await this.getUserOr404(id);
    assertSameOrganization(actor.organizationId, existing.organizationId, `User ${id} not found`);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      include: USER_INCLUDE,
    });

    if (dto.status !== existing.status) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'user.status_changed',
        entityType: 'User',
        entityId: user.id,
        summary: `Changed ${user.email}'s status from ${existing.status} to ${user.status}.`,
      });
    }
    return this.toListItem(user);
  }

  private async getUserOr404(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  private async getRoleOr404(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }
    return role;
  }

  private async getOrganizationOr404(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }
    return organization;
  }

  // Never includes passwordHash -- callers only ever see this projection.
  private toListItem(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    roleId: string;
    organizationId: string | null;
    emailNotificationsEnabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    role: { id: string; name: string };
    organization: { id: string; name: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      role: user.role,
      organization: user.organization,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
