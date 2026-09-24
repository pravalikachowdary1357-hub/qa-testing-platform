import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization } from '../common/organization-scope.util';

// Never select `content` for list responses -- these can be multi-megabyte
// blobs and the frontend only ever needs the bytes when the user explicitly
// downloads one specific file. Same convention as ProductDocument's
// DOCUMENT_SELECT.
const DOCUMENT_SELECT = {
  id: true,
  organizationId: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  uploadedBy: true,
  createdAt: true,
} satisfies Prisma.OrganizationDocumentSelect;

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class OrganizationDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(organizationId: string, actorOrganizationId: string | null) {
    assertSameOrganization(actorOrganizationId, organizationId, `Organization ${organizationId} not found`);
    return this.prisma.organizationDocument.findMany({
      where: { organizationId },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Every route below is reached by a document UUID in the URL, bypassing
  // findAll's own scope filter entirely -- so each one re-checks the
  // document's organization against the actor's organization before
  // returning anything, including file bytes.
  private async assertDocumentInScope(id: string, actorOrganizationId: string | null) {
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, document.organizationId, `Document ${id} not found`);
  }

  private async assertOrganizationInScope(organizationId: string, actorOrganizationId: string | null): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) {
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }
    assertSameOrganization(actorOrganizationId, organization.id, `Organization ${organizationId} not found`);
  }

  async getContent(id: string, actor: AuthenticatedUser) {
    await this.assertDocumentInScope(id, actor.organizationId);
    const document = await this.prisma.organizationDocument.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'download',
      entityType: 'OrganizationDocument',
      entityId: document.id,
      summary: `Downloaded "${document.fileName}"`,
    });
    return document;
  }

  async create(organizationId: string, file: UploadedFileLike | undefined, actor: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('A file is required.');
    }
    if (file.size === 0) {
      throw new BadRequestException('The selected file is empty.');
    }
    await this.assertOrganizationInScope(organizationId, actor.organizationId);

    let created;
    try {
      created = await this.prisma.organizationDocument.create({
        data: {
          organizationId,
          fileName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSize: file.size,
          content: Uint8Array.from(file.buffer),
          uploadedBy: actor.name,
        },
        select: DOCUMENT_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Organization ${organizationId} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'upload',
      entityType: 'OrganizationDocument',
      entityId: created.id,
      summary: `Uploaded "${created.fileName}"`,
    });
    return created;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    await this.assertDocumentInScope(id, actor.organizationId);
    let existing;
    try {
      existing = await this.prisma.organizationDocument.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Document ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'OrganizationDocument',
      entityId: existing.id,
      summary: `Deleted "${existing.fileName}"`,
    });
  }
}
