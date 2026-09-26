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

export interface AuditLogFilters {
  action?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
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

  // Read-only by design: there is no update/delete path for audit entries,
  // so the trail stays trustworthy. Filters only narrow what is returned.
  async findAll(
    entityType: string | undefined,
    entityId?: string,
    filters: AuditLogFilters = {},
  ) {
    const createdAt =
      filters.from || filters.to
        ? {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          }
        : undefined;
    const entries = await this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(filters.search
          ? {
              summary: {
                contains: filters.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 200,
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

  // Distinct values present in the trail, for filter pickers.
  async facets() {
    const [entityTypes, actions, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      this.prisma.auditLog.count(),
    ]);
    return {
      entityTypes: entityTypes.map((e) => e.entityType),
      actions: actions.map((a) => a.action),
      total,
    };
  }
}
