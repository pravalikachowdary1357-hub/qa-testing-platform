import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { hashPassword } from '../auth/password.util';

// One-time bootstrap for the 3 roles/users introduced by the 9-role RBAC
// restructuring (see seed.cjs's ROLE_GRANTS/ROLE_USERS) that are missing from
// an already-deployed, pre-restructuring database. Mirrors
// backend/prisma/create-missing-production-demo-roles.cjs exactly, but runs
// through the app's own PrismaService instead of a standalone script -- so
// it always targets whatever database this deployment is actually using,
// with no DATABASE_URL guessing involved.
//
// Additive only: never updates or deletes an existing role/user/permission.
const DEMO_PASSWORD = 'ChangeMe123!';

const TARGET_ROLES = [
  {
    name: 'Automation Engineer',
    description:
      'Owns test automation: develops/maintains automation frameworks, scripts, and repositories; executes automated regression; analyzes failures. Read-only on manual test cases/scenarios/execution history.',
    permissionKeys: [
      'automation:read',
      'automation:write',
      'automation:execute',
      'automation:manage',
      'test_cases:read',
      'test_scenarios:read',
      'test_executions:read',
      'reports:read',
    ],
  },
  {
    name: 'Database Test Engineer',
    description:
      'Reserved for a future database-testing capability (schema validation, data integrity, ETL, stored procedures). No TestSphere module exists for this yet, so this role currently has no granted permissions.',
    permissionKeys: [] as string[],
  },
  {
    name: 'UAT Coordinator / Business Tester',
    description:
      'Coordinates and executes User Acceptance Testing: prepares UAT test cases, manages UAT execution, records business-user feedback. Does not hold final UAT approval authority.',
    permissionKeys: [
      'uat:read',
      'uat:write',
      'uat:execute',
      'requirements:read',
      'test_cases:read',
      'reports:read',
    ],
  },
];

const TARGET_USERS = [
  {
    role: 'Automation Engineer',
    email: 'automation.engineer@testsphere.local',
    name: 'Automation Engineer',
  },
  {
    role: 'Database Test Engineer',
    email: 'database.engineer@testsphere.local',
    name: 'Database Test Engineer',
  },
  {
    role: 'UAT Coordinator / Business Tester',
    email: 'uat.coordinator@testsphere.local',
    name: 'UAT Coordinator / Business Tester',
  },
];

const ALL_REQUIRED_PERMISSION_KEYS = [
  ...new Set(TARGET_ROLES.flatMap((r) => r.permissionKeys)),
];

@Injectable()
export class AdminBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrapDemoRoles() {
    const existingRoles = await this.prisma.role.findMany({
      where: { name: { in: TARGET_ROLES.map((r) => r.name) } },
      select: { id: true, name: true },
    });
    const existingUsers = await this.prisma.user.findMany({
      where: { email: { in: TARGET_USERS.map((u) => u.email) } },
      select: { id: true, email: true },
    });
    const foundPermissions = await this.prisma.permission.findMany({
      where: { key: { in: ALL_REQUIRED_PERMISSION_KEYS } },
      select: { id: true, key: true },
    });
    const permissionIdByKey = new Map(foundPermissions.map((p) => [p.key, p.id]));
    const missingPermissionKeys = ALL_REQUIRED_PERMISSION_KEYS.filter(
      (key) => !permissionIdByKey.has(key),
    );

    if (missingPermissionKeys.length > 0) {
      throw new ConflictException(
        `Required permission keys missing from the catalog: ${missingPermissionKeys.join(', ')}. Aborting -- no changes made.`,
      );
    }

    if (existingRoles.length === TARGET_ROLES.length && existingUsers.length === TARGET_USERS.length) {
      return {
        status: 'already_bootstrapped',
        message: 'All 3 target roles and users already exist. No changes made.',
        roles: existingRoles,
        users: existingUsers,
      };
    }

    if (existingRoles.length > 0 || existingUsers.length > 0) {
      throw new ConflictException(
        `Partial state detected -- refusing to guess. Existing roles: ${
          existingRoles.map((r) => r.name).join(', ') || '(none)'
        }. Existing users: ${
          existingUsers.map((u) => u.email).join(', ') || '(none)'
        }. Resolve manually before retrying.`,
      );
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);

    const result = await this.prisma.$transaction(async (tx) => {
      const createdRoles: Record<string, { id: string; name: string }> = {};
      for (const role of TARGET_ROLES) {
        const created = await tx.role.create({
          data: {
            name: role.name,
            description: role.description,
            isSystem: false,
          },
        });
        createdRoles[role.name] = created;

        if (role.permissionKeys.length > 0) {
          await tx.rolePermission.createMany({
            data: role.permissionKeys.map((key) => ({
              roleId: created.id,
              permissionId: permissionIdByKey.get(key)!,
            })),
          });
        }
      }

      const createdUsers: { id: string; email: string }[] = [];
      for (const user of TARGET_USERS) {
        const created = await tx.user.create({
          data: {
            email: user.email,
            name: user.name,
            passwordHash,
            roleId: createdRoles[user.role].id,
          },
        });
        createdUsers.push({ id: created.id, email: created.email });
      }

      return { createdRoles, createdUsers };
    });

    return {
      status: 'created',
      message: 'Created 3 roles and 3 users.',
      roles: Object.values(result.createdRoles),
      users: result.createdUsers,
    };
  }
}
