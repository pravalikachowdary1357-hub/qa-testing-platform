import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// One-time bootstrap for the business_units:*/teams:* permission catalog
// rows, which exist in backend/prisma/seed.cjs's MODULES definition and are
// already enforced by real @RequirePermission decorators in
// business-units.controller.ts/teams.controller.ts, but were never created
// in this database because the full seed has never been run against it.
// Additive only: never updates or deletes an existing permission/role/user.
const TARGET_PERMISSIONS = [
  { key: 'business_units:read', resource: 'business_units', action: 'read', description: 'View business units' },
  { key: 'business_units:write', resource: 'business_units', action: 'write', description: 'Create and edit business units' },
  { key: 'business_units:manage', resource: 'business_units', action: 'manage', description: 'Delete and fully manage business units' },
  { key: 'teams:read', resource: 'teams', action: 'read', description: 'View teams' },
  { key: 'teams:write', resource: 'teams', action: 'write', description: 'Create and edit teams' },
  { key: 'teams:manage', resource: 'teams', action: 'manage', description: 'Delete and fully manage teams' },
];

@Injectable()
export class AdminBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrapMissingPermissions() {
    const existing = await this.prisma.permission.findMany({
      where: { key: { in: TARGET_PERMISSIONS.map((p) => p.key) } },
      select: { id: true, key: true },
    });

    if (existing.length === TARGET_PERMISSIONS.length) {
      return {
        status: 'already_bootstrapped',
        message: 'All 6 target permissions already exist. No changes made.',
        permissions: existing,
      };
    }

    if (existing.length > 0) {
      throw new ConflictException(
        `Partial state detected -- refusing to guess. Existing: ${existing.map((p) => p.key).join(', ')}. Resolve manually before retrying.`,
      );
    }

    const created = await this.prisma.permission.createManyAndReturn({
      data: TARGET_PERMISSIONS,
    });

    return {
      status: 'created',
      message: 'Created 6 permission catalog rows.',
      permissions: created.map((p) => ({ id: p.id, key: p.key })),
    };
  }
}
