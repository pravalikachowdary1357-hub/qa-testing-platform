import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface RecordAuditEntryInput {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditEntryInput) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }

  async findAll(entityType: string | undefined, entityId?: string) {
    const entries = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      metadata: entry.metadata ? (JSON.parse(entry.metadata) as unknown) : null,
      createdAt: entry.createdAt,
      actor: entry.actor,
    }));
  }
}
