import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReleaseQualityService } from '../release-quality/release-quality.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type { NotificationEvent } from '../admin-config/admin-config.constants';
import {
  decryptSecret,
  encryptSecret,
  postWebhook,
  readEmailStatus,
  readWebhooks,
  recordEmailStatus,
  recordWebhookOutcomes,
  sendEmail,
  smtpConfigured,
  validateWebhookUrl,
  webhookHint,
  writeWebhooks,
} from './notification-delivery';
import type { StoredWebhook } from './notification-delivery';
import { runScheduledNotifications } from './notification-schedule';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

// What the API ever returns about a webhook: never the URL itself.
function publicWebhook(w: StoredWebhook) {
  return {
    id: w.id,
    provider: w.provider,
    name: w.name,
    urlHint: w.urlHint,
    events: w.events,
    enabled: w.enabled,
    lastStatus: w.lastStatus,
    lastError: w.lastError,
    lastDeliveredAt: w.lastDeliveredAt,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly releaseQuality: ReleaseQualityService,
  ) {}

  // ---------------- The signed-in user's own notifications ----------------

  list(actor: AuthenticatedUser, query: ListNotificationsQueryDto) {
    return this.prisma.notification.findMany({
      where: {
        userId: actor.id,
        ...(query.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 30,
      select: {
        id: true,
        event: true,
        title: true,
        message: true,
        link: true,
        entityType: true,
        entityId: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  async unreadCount(actor: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: { userId: actor.id, readAt: null },
    });
    return { count };
  }

  async markRead(id: string, actor: AuthenticatedUser) {
    // Scoped to the owner: another user's notification is simply "not found".
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await this.prisma.notification.count({
        where: { id, userId: actor.id },
      });
      if (!exists) throw new NotFoundException(`Notification ${id} not found`);
    }
    return { ok: true };
  }

  async markAllRead(actor: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ---------------- Scheduled reminders ----------------

  async runScheduled(actor?: AuthenticatedUser) {
    const summary = await runScheduledNotifications(this.prisma);
    // Recompute readiness for products with an active release, so a
    // readiness change is noticed even when nobody opens the dashboards.
    const products = await this.prisma.release.findMany({
      where: { status: { in: ['PLANNED', 'IN_TESTING', 'COMPLETED'] } },
      select: { productId: true },
      distinct: ['productId'],
      take: 100,
    });
    for (const { productId } of products) {
      await this.releaseQuality.getProductQuality(productId);
    }
    if (actor) {
      await this.auditLog.record({
        actorUserId: actor.id,
        action: 'run-reminders',
        entityType: 'Notifications',
        summary: `Ran scheduled notifications: ${summary.approvalReminders} approval reminder(s), ${summary.escalations} escalation(s), ${summary.dueSoon} due-soon reminder(s), ${summary.overdue} overdue alert(s).`,
      });
    }
    return summary;
  }

  // ---------------- Teams / Slack webhooks ----------------

  // An administrator assigned to an organization only sees and manages that
  // organization's webhooks; a platform-level administrator sees all.
  private visibleTo(actor: AuthenticatedUser) {
    return (w: StoredWebhook) =>
      !actor.organizationId || w.organizationId === actor.organizationId;
  }

  private async findVisible(id: string, actor: AuthenticatedUser) {
    const webhooks = await readWebhooks(this.prisma);
    const current = webhooks.find(
      (w) => w.id === id && this.visibleTo(actor)(w),
    );
    if (!current) throw new NotFoundException(`Webhook ${id} not found`);
    return { webhooks, current };
  }

  async listWebhooks(actor: AuthenticatedUser) {
    return (await readWebhooks(this.prisma))
      .filter(this.visibleTo(actor))
      .map(publicWebhook);
  }

  async createWebhook(dto: CreateWebhookDto, actor: AuthenticatedUser) {
    const url = this.checkUrl(dto.provider, dto.url);
    const webhooks = await readWebhooks(this.prisma);
    if (webhooks.length >= 20)
      throw new BadRequestException('At most 20 webhooks can be configured.');
    const webhook: StoredWebhook = {
      id: randomUUID(),
      provider: dto.provider,
      name: dto.name.trim(),
      urlSealed: encryptSecret(url.toString()),
      urlHint: webhookHint(url),
      events: [...new Set(dto.events)] as NotificationEvent[],
      enabled: dto.enabled ?? true,
      lastStatus: null,
      lastError: null,
      lastDeliveredAt: null,
      organizationId: actor.organizationId ?? null,
    };
    await writeWebhooks(this.prisma, [...webhooks, webhook], actor.id);
    await this.audit(
      actor,
      'create',
      webhook,
      `Added ${this.providerLabel(webhook)} webhook "${webhook.name}"`,
    );
    return publicWebhook(webhook);
  }

  async updateWebhook(
    id: string,
    dto: UpdateWebhookDto,
    actor: AuthenticatedUser,
  ) {
    const { webhooks, current } = await this.findVisible(id, actor);
    const next: StoredWebhook = { ...current };
    if (dto.name !== undefined) next.name = dto.name.trim();
    if (dto.events !== undefined)
      next.events = [...new Set(dto.events)] as NotificationEvent[];
    if (dto.enabled !== undefined) next.enabled = dto.enabled;
    if (dto.url !== undefined) {
      const url = this.checkUrl(current.provider, dto.url);
      next.urlSealed = encryptSecret(url.toString());
      next.urlHint = webhookHint(url);
      next.lastStatus = null;
      next.lastError = null;
      next.lastDeliveredAt = null;
    }
    await writeWebhooks(
      this.prisma,
      webhooks.map((w) => (w.id === id ? next : w)),
      actor.id,
    );
    const changed = [
      dto.name !== undefined && 'name',
      dto.events !== undefined && 'events',
      dto.enabled !== undefined && (dto.enabled ? 'enabled' : 'disabled'),
      dto.url !== undefined && 'URL replaced',
    ].filter(Boolean);
    await this.audit(
      actor,
      'update',
      next,
      `Updated ${this.providerLabel(next)} webhook "${next.name}" (${changed.join(', ') || 'no changes'})`,
    );
    return publicWebhook(next);
  }

  async deleteWebhook(id: string, actor: AuthenticatedUser) {
    const { webhooks, current } = await this.findVisible(id, actor);
    await writeWebhooks(
      this.prisma,
      webhooks.filter((w) => w.id !== id),
      actor.id,
    );
    await this.audit(
      actor,
      'delete',
      current,
      `Removed ${this.providerLabel(current)} webhook "${current.name}"`,
    );
  }

  // Sends a real test message and records the real outcome. This is the
  // only way a webhook becomes "Connected".
  async testWebhook(id: string, actor: AuthenticatedUser) {
    const { current } = await this.findVisible(id, actor);
    const url = decryptSecret(current.urlSealed);
    const error = url
      ? await postWebhook(current.provider, url, {
          title: 'TestSphere test message',
          message: `This ${this.providerLabel(current)} channel is connected to QMICS TestSphere. Sent by ${actor.name}.`,
          link: '/settings',
        })
      : 'The stored URL could not be decrypted (was INTEGRATION_ENCRYPTION_KEY changed?). Replace the URL.';
    const updated = await recordWebhookOutcomes(this.prisma, [
      { id: current.id, urlSealed: current.urlSealed, error },
    ]);
    const next: StoredWebhook = updated.find((w) => w.id === id) ?? {
      ...current,
      lastStatus: error ? 'FAILED' : 'OK',
      lastError: error,
      lastDeliveredAt: new Date().toISOString(),
    };
    await this.audit(
      actor,
      'test',
      next,
      `Sent a test message to ${this.providerLabel(next)} webhook "${next.name}": ${error ? `failed (${error})` : 'delivered'}`,
    );
    return { delivered: !error, error, webhook: publicWebhook(next) };
  }

  // ---------------- Email ----------------

  async emailStatus() {
    const configured = smtpConfigured();
    return {
      configured,
      host: configured ? process.env.SMTP_HOST : null,
      from: configured ? process.env.SMTP_FROM : null,
      last: await readEmailStatus(this.prisma),
      requiredVariables: [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'SMTP_FROM',
        'SMTP_SECURE (optional)',
      ],
    };
  }

  async testEmail(actor: AuthenticatedUser) {
    if (!smtpConfigured()) {
      throw new ServiceUnavailableException(
        'Email is not configured. Set SMTP_HOST and SMTP_FROM (plus SMTP_USER / SMTP_PASS if your server needs them) in the backend environment.',
      );
    }
    const error = await sendEmail([actor.email], {
      title: 'Test email',
      message: `Email delivery from QMICS TestSphere works. Sent to ${actor.email} at ${actor.name}'s request.`,
      link: '/settings',
    });
    await recordEmailStatus(this.prisma, error);
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'test',
      entityType: 'Integration',
      entityId: 'EMAIL',
      summary: `Sent a test email to ${actor.email}: ${error ? `failed (${error})` : 'delivered'}`,
    });
    return { delivered: !error, error, to: actor.email };
  }

  // ---------------- helpers ----------------

  private checkUrl(provider: 'TEAMS' | 'SLACK', raw: string) {
    try {
      return validateWebhookUrl(provider, raw);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid webhook URL.',
      );
    }
  }

  private providerLabel(w: Pick<StoredWebhook, 'provider'>) {
    return w.provider === 'TEAMS' ? 'Microsoft Teams' : 'Slack';
  }

  private audit(
    actor: AuthenticatedUser,
    action: string,
    w: StoredWebhook,
    summary: string,
  ) {
    // Never the URL: only name, provider and events.
    return this.auditLog.record({
      actorUserId: actor.id,
      action,
      entityType: 'Integration',
      entityId: w.id,
      summary,
      metadata: { provider: w.provider, events: w.events, enabled: w.enabled },
    });
  }
}
