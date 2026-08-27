import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProductDocumentDto } from './dto/create-product-document.dto';
import { UpdateProductDocumentDto } from './dto/update-product-document.dto';
import { ReplaceProductDocumentDto } from './dto/replace-product-document.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

// Never select `content` for list/detail/version-history responses -- these
// can be multi-megabyte blobs and the frontend only ever needs the bytes
// when the user explicitly views/downloads one specific file or version.
const DOCUMENT_SELECT = {
  id: true,
  productId: true,
  documentType: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  version: true,
  description: true,
  status: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductDocumentSelect;

const VERSION_SELECT = {
  id: true,
  documentId: true,
  version: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  description: true,
  status: true,
  uploadedBy: true,
  createdAt: true,
} satisfies Prisma.ProductDocumentVersionSelect;

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ProductDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string) {
    return this.prisma.productDocument.findMany({
      where: { productId },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.productDocument.findUnique({
      where: { id },
      select: DOCUMENT_SELECT,
    });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return document;
  }

  // Merges the live document (as the newest entry) with its archived
  // versions into one descending timeline, so the frontend can render a
  // single "version history" list without knowing about the two tables
  // behind it.
  async findVersionHistory(id: string) {
    const document = await this.findOne(id);
    const versions = await this.prisma.productDocumentVersion.findMany({
      where: { documentId: id },
      select: VERSION_SELECT,
      orderBy: { version: 'desc' },
    });

    return [
      {
        id: document.id,
        isCurrent: true,
        version: document.version,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        description: document.description,
        status: document.status,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.updatedAt,
      },
      ...versions.map((v) => ({
        id: v.id,
        isCurrent: false,
        version: v.version,
        fileName: v.fileName,
        mimeType: v.mimeType,
        fileSize: v.fileSize,
        description: v.description,
        status: v.status,
        uploadedBy: v.uploadedBy,
        uploadedAt: v.createdAt,
      })),
    ];
  }

  async getContent(id: string, actor: AuthenticatedUser) {
    const document = await this.prisma.productDocument.findUnique({
      where: { id },
    });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'download',
      entityType: 'ProductDocument',
      entityId: document.id,
      summary: `Downloaded "${document.fileName}" (v${document.version})`,
    });
    return document;
  }

  async getVersionContent(
    documentId: string,
    versionId: string,
    actor: AuthenticatedUser,
  ) {
    const version = await this.prisma.productDocumentVersion.findFirst({
      where: { id: versionId, documentId },
    });
    if (!version) {
      throw new NotFoundException(`Document version ${versionId} not found`);
    }
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'download',
      entityType: 'ProductDocument',
      entityId: documentId,
      summary: `Downloaded "${version.fileName}" (v${version.version})`,
    });
    return version;
  }

  async create(
    dto: CreateProductDocumentDto,
    file: UploadedFileLike | undefined,
    actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required.');
    }
    if (file.size === 0) {
      throw new BadRequestException('The selected file is empty.');
    }

    let created;
    try {
      created = await this.prisma.productDocument.create({
        data: {
          productId: dto.productId,
          documentType: dto.documentType,
          description: dto.description,
          status: dto.status ?? 'DRAFT',
          fileName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSize: file.size,
          content: Uint8Array.from(file.buffer),
          uploadedBy: actor.name,
        },
        select: DOCUMENT_SELECT,
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

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'upload',
      entityType: 'ProductDocument',
      entityId: created.id,
      summary: `Uploaded "${created.fileName}"`,
    });
    return created;
  }

  async update(id: string, dto: UpdateProductDocumentDto, actor: AuthenticatedUser) {
    let updated;
    try {
      updated = await this.prisma.productDocument.update({
        where: { id },
        data: dto,
        select: DOCUMENT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Document ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'ProductDocument',
      entityId: updated.id,
      summary: `Updated metadata for "${updated.fileName}"`,
    });
    return updated;
  }

  async replace(
    id: string,
    file: UploadedFileLike | undefined,
    dto: ReplaceProductDocumentDto,
    actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required.');
    }
    if (file.size === 0) {
      throw new BadRequestException('The selected file is empty.');
    }

    const existing = await this.prisma.productDocument.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.productDocumentVersion.create({
        data: {
          documentId: existing.id,
          version: existing.version,
          fileName: existing.fileName,
          mimeType: existing.mimeType,
          fileSize: existing.fileSize,
          content: existing.content,
          description: existing.description,
          status: existing.status,
          uploadedBy: existing.uploadedBy,
          createdAt: existing.updatedAt,
        },
      }),
      this.prisma.productDocument.update({
        where: { id },
        data: {
          version: existing.version + 1,
          fileName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSize: file.size,
          content: Uint8Array.from(file.buffer),
          description: dto.description ?? existing.description,
          status: dto.status ?? existing.status,
          uploadedBy: actor.name,
        },
        select: DOCUMENT_SELECT,
      }),
    ]);

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'replace',
      entityType: 'ProductDocument',
      entityId: updated.id,
      summary: `Replaced "${existing.fileName}" with "${updated.fileName}" (now v${updated.version})`,
    });
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    let existing;
    try {
      existing = await this.prisma.productDocument.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Document ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'ProductDocument',
      entityId: existing.id,
      summary: `Deleted "${existing.fileName}"`,
    });
  }
}
