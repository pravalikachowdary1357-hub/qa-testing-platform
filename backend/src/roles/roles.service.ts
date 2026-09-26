import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleDto, UpdateRoleDetailsDto } from './dto/role-details.dto';
import { Prisma } from '../../generated/prisma/client.js';
import { AuthenticatedUser } from '../auth/current-user.decorator';

// Kept in sync with seed.cjs's platform-administrator role name -- this was
// stale at 'Admin' (the role's pre-rename name from before the 6-role
// consolidation), which meant this guard silently never matched the real
// admin role since that rename. Fixed here as part of the 9-role update.
const ADMIN_ROLE_NAME = 'System Administrator';
const ROLES_MANAGE_KEY = 'roles:manage';
// The administrator can never strip its own ability to see and fix role
// permissions (both keys are needed to use Roles & Permissions at all).
const ADMIN_ESSENTIAL_KEYS = ['roles:read', ROLES_MANAGE_KEY];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    }));
  }

  async listPermissionCatalog() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  async updatePermissions(
    roleId: string,
    dto: UpdateRolePermissionsDto,
    actor: AuthenticatedUser,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });
    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permission ids do not exist.');
    }

    if (
      role.name === ADMIN_ROLE_NAME &&
      !ADMIN_ESSENTIAL_KEYS.every((key) =>
        permissions.some((permission) => permission.key === key),
      )
    ) {
      throw new ForbiddenException(
        `The ${ADMIN_ROLE_NAME} role must always retain the ${ADMIN_ESSENTIAL_KEYS.join(' and ')} permissions, to prevent locking every administrator out of Roles & Permissions.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      }),
    ]);

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'role.permissions_updated',
      entityType: 'Role',
      entityId: roleId,
      summary: `Updated permissions for role "${role.name}" (${permissions.length} permission(s) granted).`,
      metadata: { permissionKeys: permissions.map((p) => p.key) },
    });

    return this.findAll().then((roles) => roles.find((r) => r.id === roleId));
  }

  private async assertPermissionIds(permissionIds: string[]) {
    const found = await this.prisma.permission.count({
      where: { id: { in: permissionIds } },
    });
    if (found !== permissionIds.length) {
      throw new BadRequestException('One or more permission ids do not exist.');
    }
  }

  private conflict(error: unknown, name: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(`A role named "${name}" already exists.`);
    }
    throw error;
  }

  // Custom roles are never system roles; the System Administrator role is the
  // only protected (isSystem) role and cannot be created through the API.
  async create(dto: CreateRoleDto, actor: AuthenticatedUser) {
    const name = dto.name.trim();
    if (name.toLowerCase() === ADMIN_ROLE_NAME.toLowerCase()) {
      throw new ConflictException(
        `A role named "${ADMIN_ROLE_NAME}" already exists.`,
      );
    }
    await this.assertPermissionIds(dto.permissionIds);

    let role;
    try {
      role = await this.prisma.role.create({
        data: {
          name,
          description: dto.description?.trim() || null,
          isSystem: false,
          rolePermissions: {
            create: dto.permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
      });
    } catch (error) {
      this.conflict(error, name);
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'role.created',
      entityType: 'Role',
      entityId: role.id,
      summary: `Created role "${role.name}" with ${dto.permissionIds.length} permission(s).`,
    });
    return this.findAll().then((roles) => roles.find((r) => r.id === role.id));
  }

  async updateDetails(
    roleId: string,
    dto: UpdateRoleDetailsDto,
    actor: AuthenticatedUser,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);

    const name = dto.name?.trim();
    // Role names are referenced by the app (e.g. the admin dashboard and the
    // admin-lockout guard), so the protected system role keeps its name.
    if (role.isSystem && name !== undefined && name !== role.name) {
      throw new ForbiddenException(
        `The ${role.name} role is a protected system role and cannot be renamed.`,
      );
    }

    let updated;
    try {
      updated = await this.prisma.role.update({
        where: { id: roleId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() || null }
            : {}),
        },
      });
    } catch (error) {
      this.conflict(error, name ?? role.name);
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'role.updated',
      entityType: 'Role',
      entityId: roleId,
      summary: `Updated role "${updated.name}"${name && name !== role.name ? ` (renamed from "${role.name}")` : ''}.`,
    });
    return this.findAll().then((roles) => roles.find((r) => r.id === roleId));
  }

  async remove(roleId: string, actor: AuthenticatedUser) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    if (role.isSystem) {
      throw new ForbiddenException(
        `The ${role.name} role is a protected system role and cannot be deleted.`,
      );
    }
    if (role._count.users > 0) {
      throw new ConflictException(
        `Role "${role.name}" is assigned to ${role._count.users} user(s). Reassign them before deleting the role.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.role.delete({ where: { id: roleId } }),
    ]);

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'role.deleted',
      entityType: 'Role',
      entityId: roleId,
      summary: `Deleted role "${role.name}".`,
    });
  }
}
