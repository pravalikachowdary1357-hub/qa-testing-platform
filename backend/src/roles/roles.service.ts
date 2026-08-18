import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { AuthenticatedUser } from '../auth/current-user.decorator';

const ADMIN_ROLE_NAME = 'Admin';
const ROLES_MANAGE_KEY = 'roles:manage';

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
      throw new BadRequestException(
        'One or more permission ids do not exist.',
      );
    }

    if (
      role.name === ADMIN_ROLE_NAME &&
      !permissions.some((permission) => permission.key === ROLES_MANAGE_KEY)
    ) {
      throw new ForbiddenException(
        `The ${ADMIN_ROLE_NAME} role must always retain the ${ROLES_MANAGE_KEY} permission, to prevent locking every administrator out of Roles & Permissions.`,
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
}
