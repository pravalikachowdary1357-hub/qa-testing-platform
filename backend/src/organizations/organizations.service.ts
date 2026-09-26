import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
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

export const MAX_LOGO_FILE_SIZE_MB = 2;
export const MAX_LOGO_FILE_SIZE_BYTES = MAX_LOGO_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Never select logoContent for list/detail responses -- it's a binary blob
// and the frontend only fetches it via the dedicated GET .../logo route.
// Same convention as ProductDocument's DOCUMENT_SELECT.
const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  orgKey: true,
  description: true,
  status: true,
  orgReferenceId: true,
  location: true,
  establishedYear: true,
  email: true,
  logoFileName: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true, businessUnits: true, projects: true, teams: true, users: true } },
} satisfies Prisma.OrganizationSelect;

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
      select: ORGANIZATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return organizations.map((organization) => this.toListItem(organization));
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { ...ORGANIZATION_SELECT, products: true },
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
    // A user who belongs to an organization can only ever see that one
    // organization (see findAll), so letting them create another would
    // produce an organization nobody in their tenant can see or manage.
    // Creating organizations is a platform-level (unscoped) action.
    if (actor?.organizationId) {
      throw new ForbiddenException(
        'Only a platform-level administrator (not assigned to an organization) can create organizations.',
      );
    }
    let created;
    try {
      created = await this.prisma.organization.create({ data: dto, select: ORGANIZATION_SELECT });
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
    return this.toListItem(created);
  }

  async bulkImport(
    rows: Record<string, string>[],
    actor: AuthenticatedUser,
  ): Promise<ImportResult> {
    if (actor.organizationId) {
      throw new ForbiddenException(
        'Only a platform-level administrator (not assigned to an organization) can create organizations.',
      );
    }
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
        select: ORGANIZATION_SELECT,
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
    return this.toListItem(updated);
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
    orgReferenceId: string | null;
    location: string | null;
    establishedYear: number | null;
    email: string | null;
    logoFileName: string | null;
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
      orgReferenceId: organization.orgReferenceId,
      location: organization.location,
      establishedYear: organization.establishedYear,
      email: organization.email,
      hasLogo: organization.logoFileName !== null,
      productCount: organization._count.products,
      projectCount: organization._count.projects,
      businessUnitCount: organization._count.businessUnits,
      teamCount: organization._count.teams,
      userCount: organization._count.users,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  async uploadLogo(id: string, file: UploadedFileLike | undefined, actor: AuthenticatedUser) {
    assertSameOrganization(actor.organizationId, id, `Organization ${id} not found`);
    if (!file) {
      throw new BadRequestException('A file is required.');
    }
    if (file.size === 0) {
      throw new BadRequestException('The selected file is empty.');
    }
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed types: PNG, JPEG, SVG, WebP.`,
      );
    }

    let updated;
    try {
      updated = await this.prisma.organization.update({
        where: { id },
        data: {
          logoContent: Uint8Array.from(file.buffer),
          logoMimeType: file.mimetype,
          logoFileName: file.originalname,
          logoFileSize: file.size,
        },
        select: ORGANIZATION_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Organization ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'Organization',
      entityId: updated.id,
      summary: `Updated logo for organization "${updated.name}"`,
    });
    return this.toListItem(updated);
  }

  async getLogo(id: string, actorOrganizationId: string | null) {
    assertSameOrganization(actorOrganizationId, id, `Organization ${id} not found`);
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { logoContent: true, logoMimeType: true, logoFileName: true, logoFileSize: true },
    });
    if (!organization || organization.logoContent === null) {
      throw new NotFoundException(`Organization ${id} has no logo`);
    }
    return {
      content: organization.logoContent,
      mimeType: organization.logoMimeType ?? 'application/octet-stream',
      fileName: organization.logoFileName ?? 'logo',
      fileSize: organization.logoFileSize ?? organization.logoContent.length,
    };
  }

  async removeLogo(id: string, actor: AuthenticatedUser) {
    assertSameOrganization(actor.organizationId, id, `Organization ${id} not found`);
    let updated;
    try {
      updated = await this.prisma.organization.update({
        where: { id },
        data: { logoContent: null, logoMimeType: null, logoFileName: null, logoFileSize: null },
        select: ORGANIZATION_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Organization ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'Organization',
      entityId: updated.id,
      summary: `Removed logo from organization "${updated.name}"`,
    });
    return this.toListItem(updated);
  }
}
