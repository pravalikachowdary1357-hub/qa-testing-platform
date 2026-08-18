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

const USER_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;

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

  async findAll(query: ListUsersQueryDto) {
    const status = validateStatusParam(query.status);
    const users = await this.prisma.user.findMany({
      where: {
        roleId: query.roleId,
        status,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { role: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toListItem(user));
  }

  async findOne(id: string) {
    const user = await this.getUserOr404(id);
    return this.toListItem(user);
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    await this.getRoleOr404(dto.roleId);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash: await hashPassword(dto.password),
          roleId: dto.roleId,
        },
        include: { role: { select: { id: true, name: true } } },
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
      include: { role: { select: { id: true, name: true } } },
    });
    return this.toListItem(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot change your own role.');
    }
    const existing = await this.getUserOr404(id);
    if (dto.roleId) {
      await this.getRoleOr404(dto.roleId);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: { select: { id: true, name: true } } },
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

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      include: { role: { select: { id: true, name: true } } },
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
      include: { role: { select: { id: true, name: true } } },
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

  // Never includes passwordHash -- callers only ever see this projection.
  private toListItem(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    roleId: string;
    emailNotificationsEnabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    role: { id: string; name: string };
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      role: user.role,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
