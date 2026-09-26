import { notifyRequirementChange } from '../notifications/notification-events';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, RequirementStatus } from '../../generated/prisma/client.js';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import {
  ReviewRequirementDto,
  type ReviewDecision,
} from './dto/review-requirement.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type {
  ImportResult,
  ImportRowError,
} from '../common/import/import-result.interface';
import {
  REQUIREMENT_FIELD_LABELS,
  REQUIREMENT_TRACKED_FIELDS,
} from './requirements.constants';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';
import {
  assertApprovalComment,
  assertWorkflowTransition,
} from '../admin-config/admin-config.service';

const PRODUCT_REF_SELECT = { select: { id: true, name: true, organizationId: true } };
const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };
const USER_REF_SELECT = {
  select: { id: true, name: true, email: true, status: true },
};

const REQUIREMENT_INCLUDE = {
  product: PRODUCT_REF_SELECT,
  release: RELEASE_REF_SELECT,
  owner: USER_REF_SELECT,
};

// Only findOne() pays for acceptance criteria + reviewer -- a list of many
// requirements shouldn't carry every criterion, matching how ProductDocument
// never embeds its versions in the base select.
const REQUIREMENT_DETAIL_INCLUDE = {
  ...REQUIREMENT_INCLUDE,
  reviewedBy: USER_REF_SELECT,
  acceptanceCriteria: { orderBy: { sortOrder: 'asc' as const } },
};

// Never select `content` here -- it can be a multi-megabyte blob and the
// frontend only needs the bytes when explicitly downloading one attachment.
const ATTACHMENT_SELECT = {
  id: true,
  requirementId: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  uploadedBy: true,
  createdAt: true,
} satisfies Prisma.RequirementAttachmentSelect;

const REVIEW_STATUS_MAP: Record<ReviewDecision, RequirementStatus> = {
  APPROVED: RequirementStatus.APPROVED,
  REJECTED: RequirementStatus.REJECTED,
  RETURNED_FOR_REWORK: RequirementStatus.DRAFT,
};

const REVIEW_ACTION_LABEL: Record<ReviewDecision, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED_FOR_REWORK: 'Returned for rework',
};

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface FieldChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

function nextVersion(current: string): string {
  const match = /^(\d+)\.(\d+)$/.exec(current);
  if (!match) return '1.1';
  const [, major, minor] = match;
  return `${major}.${Number(minor) + 1}`;
}

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.requirement.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: REQUIREMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      include: REQUIREMENT_DETAIL_INCLUDE,
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, requirement.product.organizationId, `Requirement ${id} not found`);

    return requirement;
  }

  async create(dto: CreateRequirementDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    const { acceptanceCriteria, ...scalarDto } = dto;

    let created;
    try {
      created = await this.prisma.requirement.create({
        data: {
          ...scalarDto,
          acceptanceCriteria: acceptanceCriteria?.length
            ? {
                create: acceptanceCriteria.map((text, index) => ({
                  text: text.trim(),
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: REQUIREMENT_DETAIL_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }

    await this.prisma.requirementVersion.create({
      data: {
        requirementId: created.id,
        version: created.version,
        changedById: actor.id,
        summary: 'Requirement created',
      },
    });

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'Requirement',
      entityId: created.id,
      summary: `Created requirement "${created.title}"`,
    });
    await notifyRequirementChange(this.prisma, actor, null, created);

    return created;
  }

  async update(
    id: string,
    dto: UpdateRequirementDto,
    actor: AuthenticatedUser,
  ) {
    if (
      dto.status === RequirementStatus.APPROVED ||
      dto.status === RequirementStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Use the review endpoint to approve or reject a requirement.',
      );
    }

    const before = await this.prisma.requirement.findUnique({
      where: { id },
      select: { status: true, ownerId: true },
    });
    if (before) {
      await assertWorkflowTransition(
        this.prisma,
        'REQUIREMENT',
        before.status,
        dto.status,
      );
    }

    const { updated, changes, criteriaChanged } = await this.persistChange(
      id,
      dto,
      actor,
    );

    const summaryParts = this.describeChanges(changes, criteriaChanged);
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'Requirement',
      entityId: id,
      summary:
        summaryParts.length > 0
          ? `Updated requirement "${updated.title}": ${summaryParts.join('; ')}`
          : `Updated requirement "${updated.title}"`,
    });
    await notifyRequirementChange(this.prisma, actor, before, updated);

    return updated;
  }

  async review(
    id: string,
    dto: ReviewRequirementDto,
    actor: AuthenticatedUser,
  ) {
    const current = await this.prisma.requirement.findUnique({
      where: { id },
      include: { product: { select: { organizationId: true } } },
    });
    if (!current) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, current.product.organizationId, `Requirement ${id} not found`);
    if (current.status !== RequirementStatus.IN_REVIEW) {
      throw new BadRequestException(
        'Only a requirement that is In Review can be approved, rejected, or returned for rework.',
      );
    }
    await assertWorkflowTransition(
      this.prisma,
      'REQUIREMENT',
      current.status,
      REVIEW_STATUS_MAP[dto.decision],
    );
    await assertApprovalComment(
      this.prisma,
      'REQUIREMENT_REVIEW',
      dto.decision,
      dto.comment,
      actor,
    );

    const { updated } = await this.persistChange(
      id,
      {
        status: REVIEW_STATUS_MAP[dto.decision],
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewComment: dto.comment ?? null,
      } as unknown as UpdateRequirementDto,
      actor,
      dto.comment,
    );

    await this.auditLog.record({
      actorUserId: actor.id,
      action: dto.decision.toLowerCase(),
      entityType: 'Requirement',
      entityId: id,
      summary: `${REVIEW_ACTION_LABEL[dto.decision]} requirement "${updated.title}"${
        dto.comment ? `: ${dto.comment}` : ''
      }`,
    });

    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existingWithProduct = await this.prisma.requirement.findUnique({
      where: { id },
      include: { product: { select: { organizationId: true } } },
    });
    if (!existingWithProduct) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existingWithProduct.product.organizationId,
      `Requirement ${id} not found`,
    );

    let existing;
    try {
      existing = await this.prisma.requirement.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Requirement ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'Requirement',
      entityId: existing.id,
      summary: `Deleted requirement "${existing.title}"`,
    });
  }

  // Every sub-resource route below is reached by a requirement UUID in the
  // URL, bypassing findOne()'s own scope check entirely -- so each one needs
  // its own confirmation that the requirement is actually visible to this
  // actor before touching its activity/versions/attachments.
  private async assertRequirementInScope(id: string, actorOrganizationId: string | null) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!requirement) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, requirement.product.organizationId, `Requirement ${id} not found`);
  }

  private async assertProductInScope(productId: string, actorOrganizationId: string | null): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { organizationId: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    assertSameOrganization(actorOrganizationId, product.organizationId, `Product ${productId} not found`);
  }

  async findActivity(id: string, actor: AuthenticatedUser) {
    await this.assertRequirementInScope(id, actor.organizationId);
    return this.auditLog.findAll('Requirement', id);
  }

  async findVersions(id: string, actor: AuthenticatedUser) {
    await this.assertRequirementInScope(id, actor.organizationId);
    const versions = await this.prisma.requirementVersion.findMany({
      where: { requirementId: id },
      include: { changedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { changedAt: 'desc' },
    });

    return versions.map((v) => ({
      ...v,
      changes: v.changes ? (JSON.parse(v.changes) as unknown) : null,
    }));
  }

  async listAttachments(requirementId: string, actor: AuthenticatedUser) {
    await this.assertRequirementInScope(requirementId, actor.organizationId);
    return this.prisma.requirementAttachment.findMany({
      where: { requirementId },
      select: ATTACHMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAttachmentContent(
    requirementId: string,
    attachmentId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertRequirementInScope(requirementId, actor.organizationId);
    const attachment = await this.prisma.requirementAttachment.findFirst({
      where: { id: attachmentId, requirementId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'download',
      entityType: 'Requirement',
      entityId: requirementId,
      summary: `Downloaded attachment "${attachment.fileName}"`,
    });

    return attachment;
  }

  async addAttachment(
    requirementId: string,
    file: UploadedFileLike | undefined,
    actor: AuthenticatedUser,
  ) {
    await this.assertRequirementInScope(requirementId, actor.organizationId);
    if (!file) {
      throw new BadRequestException('A file is required.');
    }
    if (file.size === 0) {
      throw new BadRequestException('The selected file is empty.');
    }

    let created;
    try {
      created = await this.prisma.requirementAttachment.create({
        data: {
          requirementId,
          fileName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSize: file.size,
          content: Uint8Array.from(file.buffer),
          uploadedBy: actor.name,
        },
        select: ATTACHMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Requirement ${requirementId} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'attachment_added',
      entityType: 'Requirement',
      entityId: requirementId,
      summary: `Added attachment "${created.fileName}"`,
    });

    return created;
  }

  async removeAttachment(
    requirementId: string,
    attachmentId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertRequirementInScope(requirementId, actor.organizationId);
    const attachment = await this.prisma.requirementAttachment.findFirst({
      where: { id: attachmentId, requirementId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    await this.prisma.requirementAttachment.delete({
      where: { id: attachmentId },
    });

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'attachment_removed',
      entityType: 'Requirement',
      entityId: requirementId,
      summary: `Removed attachment "${attachment.fileName}"`,
    });
  }

  async bulkImport(
    rows: Record<string, string>[],
    productId: string,
    actor: AuthenticatedUser,
  ): Promise<ImportResult> {
    const errors: ImportRowError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // account for the header line
      const raw = rows[i];

      let ownerId: string | undefined;
      const ownerEmail = raw['owner email']?.trim();
      if (ownerEmail) {
        const owner = await this.prisma.user.findFirst({
          where: { email: { equals: ownerEmail, mode: 'insensitive' } },
        });
        if (!owner) {
          errors.push({
            row: rowNumber,
            message: `No user found with email "${ownerEmail}"`,
          });
          continue;
        }
        ownerId = owner.id;
      }

      const candidate = {
        productId,
        title: raw.title,
        description: raw.description,
        type: raw.type?.trim().toUpperCase() || undefined,
        priority: raw.priority?.trim().toUpperCase() || undefined,
        riskLevel: raw.risk?.trim().toUpperCase() || undefined,
        status: raw.status?.trim().toUpperCase() || undefined,
        ownerId,
      };

      const result = await validateRow(CreateRequirementDto, candidate);
      if ('error' in result) {
        errors.push({ row: rowNumber, message: result.error });
        continue;
      }

      try {
        await this.create(result.dto, actor);
        successCount++;
      } catch (error) {
        errors.push({
          row: rowNumber,
          message:
            error instanceof Error ? error.message : 'Failed to create row',
        });
      }
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'import',
      entityType: 'Requirement',
      entityId: productId,
      summary: `Imported ${successCount} of ${rows.length} requirement(s)`,
    });

    return { totalRows: rows.length, successCount, errors };
  }

  // Shared by update() and review(): diffs the tracked fields against the
  // current row, applies the change (plus a full acceptance-criteria
  // replace if that array was sent) in one transaction, and -- only if
  // something tracked actually changed -- bumps `version` and appends one
  // RequirementVersion row. Untracked fields (e.g. productId) still get
  // applied normally, they just don't produce a history entry.
  private async persistChange(
    id: string,
    changeData: UpdateRequirementDto,
    actor: AuthenticatedUser,
    versionComment?: string,
  ) {
    const current = await this.prisma.requirement.findUnique({
      where: { id },
      include: {
        acceptanceCriteria: { orderBy: { sortOrder: 'asc' } },
        product: { select: { organizationId: true } },
      },
    });
    if (!current) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, current.product.organizationId, `Requirement ${id} not found`);
    const actorId = actor.id;

    const { acceptanceCriteria, ...rest } = changeData;
    const currentRecord = current as unknown as Record<string, unknown>;
    const restRecord = rest as unknown as Record<string, unknown>;

    const changes: FieldChange[] = [];
    for (const field of REQUIREMENT_TRACKED_FIELDS) {
      // `field in restRecord` is unreliable here: TypeScript's class-field
      // semantics (useDefineForClassFields) make every declared DTO
      // property an own key set to `undefined` at construction, even when
      // the request body omitted it entirely -- so every optional field
      // would otherwise look "present". `undefined` never carries meaning
      // as an explicit value in this codebase's DTOs (see the `|| undefined`
      // convention throughout the frontend), so treat it the same as
      // "not provided" here too.
      const newValue = restRecord[field];
      if (newValue === undefined) continue;
      const previousValue = currentRecord[field];
      if (newValue !== previousValue) {
        changes.push({
          field: REQUIREMENT_FIELD_LABELS[field],
          previousValue,
          newValue,
        });
      }
    }

    let criteriaChanged = false;
    if (acceptanceCriteria !== undefined) {
      const currentTexts = current.acceptanceCriteria.map((c) => c.text);
      const newTexts = acceptanceCriteria.map((t) => t.trim());
      criteriaChanged =
        currentTexts.length !== newTexts.length ||
        currentTexts.some((text, index) => text !== newTexts[index]);
    }

    const shouldBumpVersion = changes.length > 0 || criteriaChanged;
    const version = shouldBumpVersion
      ? nextVersion(current.version)
      : current.version;

    const operations: Prisma.PrismaPromise<unknown>[] = [];
    if (criteriaChanged) {
      operations.push(
        this.prisma.requirementAcceptanceCriterion.deleteMany({
          where: { requirementId: id },
        }),
        this.prisma.requirementAcceptanceCriterion.createMany({
          data: (acceptanceCriteria ?? []).map((text, index) => ({
            requirementId: id,
            text: text.trim(),
            sortOrder: index,
          })),
        }),
      );
    }

    let updated: Prisma.RequirementGetPayload<{
      include: typeof REQUIREMENT_DETAIL_INCLUDE;
    }>;
    try {
      const updateOp = this.prisma.requirement.update({
        where: { id },
        data: { ...rest, ...(shouldBumpVersion ? { version } : {}) },
        include: REQUIREMENT_DETAIL_INCLUDE,
      });
      const results = await this.prisma.$transaction([...operations, updateOp]);
      updated = results[results.length - 1] as typeof updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Requirement ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'Related product, release, or owner not found',
          );
        }
      }
      throw error;
    }

    if (shouldBumpVersion) {
      await this.prisma.requirementVersion.create({
        data: {
          requirementId: id,
          version,
          changedById: actorId,
          summary:
            this.describeChanges(changes, criteriaChanged).join('; ') ||
            'Requirement updated',
          changes: changes.length > 0 ? JSON.stringify(changes) : null,
          comment: versionComment,
        },
      });
    }

    return { updated, changes, criteriaChanged };
  }

  private describeChanges(
    changes: FieldChange[],
    criteriaChanged: boolean,
  ): string[] {
    const parts = changes.map(
      (c) => `${c.field}: ${String(c.previousValue)} → ${String(c.newValue)}`,
    );
    if (criteriaChanged) parts.push('Acceptance Criteria updated');
    return parts;
  }
}
