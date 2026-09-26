import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { PrismaService } from '../prisma.service';
import {
  APPROVAL_PERMISSION,
  CONFIG_KEYS,
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_EVENTS,
  defaultApproval,
} from '../admin-config/admin-config.constants';
import type {
  ApprovalKey,
  ApprovalPolicy,
  NotificationChannel,
  NotificationConfig,
  NotificationEvent,
} from '../admin-config/admin-config.constants';

// Notification delivery (Requirements section 24). Business modules call
// notify() after a change has been saved; it never throws, so a delivery
// problem can never undo or block the user's action.

const logger = new Logger('Notifications');

export const WEBHOOKS_CONFIG_KEY = 'integration.webhooks';
export const EMAIL_STATUS_KEY = 'integration.email.status';

// ---------------------------------------------------------------- config

async function readJson<T>(
  prisma: PrismaService,
  key: string,
  fallback: T,
): Promise<T> {
  const row = await prisma.platformConfiguration.findUnique({ where: { key } });
  return row ? { ...fallback, ...(row.value as object) } : fallback;
}

export async function readNotificationConfig(
  prisma: PrismaService,
): Promise<NotificationConfig> {
  const config = await readJson<NotificationConfig>(
    prisma,
    CONFIG_KEYS.notifications,
    DEFAULT_NOTIFICATIONS,
  );
  return {
    ...config,
    routing: { ...DEFAULT_NOTIFICATIONS.routing, ...(config.routing ?? {}) },
    recipientRoleIds: config.recipientRoleIds ?? {},
  };
}

// ---------------------------------------------------------------- secrets

// Webhook URLs are secrets (anyone holding one can post to the channel), so
// they are stored AES-256-GCM encrypted and never returned by the API. The
// key comes from INTEGRATION_ENCRYPTION_KEY, falling back to a key derived
// from DATABASE_URL, which is never stored in the database itself.
function encryptionKey(): Buffer {
  const material =
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    `${process.env.DATABASE_URL ?? ''}::testsphere-integrations`;
  return createHash('sha256').update(material).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    data.toString('base64'),
  ].join('.');
}

export function decryptSecret(sealed: string): string | null {
  try {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== 'v1') return null;
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- webhooks

export type WebhookProvider = 'TEAMS' | 'SLACK';

export interface StoredWebhook {
  id: string;
  provider: WebhookProvider;
  name: string;
  urlSealed: string;
  urlHint: string;
  events: NotificationEvent[];
  enabled: boolean;
  lastStatus: 'OK' | 'FAILED' | null;
  lastError: string | null;
  lastDeliveredAt: string | null;
  // Tenant of the administrator who added it. null = platform-level
  // webhook (added by an unscoped administrator), which may receive every
  // organization's notifications; an organization's webhook only ever
  // receives that organization's notifications.
  organizationId?: string | null;
}

// Records delivery outcomes on a fresh read of the list, so a webhook that
// was deleted, or whose URL was replaced, while a message was in flight is
// never brought back or overwritten with stale data.
export async function recordWebhookOutcomes(
  prisma: PrismaService,
  outcomes: { id: string; urlSealed: string; error: string | null }[],
) {
  const now = new Date().toISOString();
  const latest = await readWebhooks(prisma);
  const updated = latest.map((w) => {
    const outcome = outcomes.find(
      (o) => o.id === w.id && o.urlSealed === w.urlSealed,
    );
    return outcome
      ? {
          ...w,
          lastStatus: outcome.error ? ('FAILED' as const) : ('OK' as const),
          lastError: outcome.error,
          lastDeliveredAt: now,
        }
      : w;
  });
  await writeWebhooks(prisma, updated);
  return updated;
}

// Only genuine Slack / Microsoft Teams webhook hosts are accepted, so this
// feature cannot be used to make the server call arbitrary addresses.
const ALLOWED_HOSTS: Record<WebhookProvider, RegExp[]> = {
  SLACK: [/^hooks\.slack\.com$/],
  TEAMS: [
    /^[a-z0-9-]+\.webhook\.office\.com$/,
    /^[a-z0-9.-]+\.logic\.azure\.com$/,
    /^[a-z0-9.-]+\.powerplatform\.com$/,
    /^[a-z0-9.-]+\.environment\.api\.powerplatform\.com$/,
  ],
};

export function validateWebhookUrl(
  provider: WebhookProvider,
  raw: string,
): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('Enter a valid webhook URL.');
  }
  if (url.protocol !== 'https:')
    throw new Error('The webhook URL must start with https://.');
  if (url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error(
      'The webhook URL must not contain credentials or a custom port.',
    );
  }
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS[provider].some((pattern) => pattern.test(host))) {
    throw new Error(
      provider === 'SLACK'
        ? 'A Slack incoming-webhook URL must be on hooks.slack.com.'
        : 'A Teams webhook URL must be a Microsoft Teams / Power Automate workflow webhook (webhook.office.com, logic.azure.com or powerplatform.com).',
    );
  }
  return url;
}

export function webhookHint(url: URL): string {
  const tail = url.pathname.replace(/\/+$/, '').slice(-4);
  return `${url.hostname}/…${tail}`;
}

export async function readWebhooks(
  prisma: PrismaService,
): Promise<StoredWebhook[]> {
  const row = await prisma.platformConfiguration.findUnique({
    where: { key: WEBHOOKS_CONFIG_KEY },
  });
  const list = (row?.value as { webhooks?: StoredWebhook[] } | null)?.webhooks;
  return Array.isArray(list) ? list : [];
}

export async function writeWebhooks(
  prisma: PrismaService,
  webhooks: StoredWebhook[],
  actorId?: string,
) {
  const value = { webhooks } as object;
  await prisma.platformConfiguration.upsert({
    where: { key: WEBHOOKS_CONFIG_KEY },
    create: {
      key: WEBHOOKS_CONFIG_KEY,
      value,
      updatedByUserId: actorId ?? null,
    },
    update: { value, ...(actorId ? { updatedByUserId: actorId } : {}) },
  });
}

export interface OutgoingMessage {
  title: string;
  message: string;
  link?: string | null;
}

function absoluteLink(link?: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//.test(link)) return link;
  const base = (
    process.env.APP_BASE_URL ||
    (process.env.CORS_ORIGIN ?? '').split(',')[0] ||
    ''
  ).trim();
  return base
    ? `${base.replace(/\/+$/, '')}${link.startsWith('/') ? '' : '/'}${link}`
    : null;
}

function webhookBody(provider: WebhookProvider, msg: OutgoingMessage) {
  const link = absoluteLink(msg.link);
  if (provider === 'SLACK') {
    return {
      text: `*${msg.title}*\n${msg.message}${link ? `\n<${link}|Open in TestSphere>` : ''}`,
    };
  }
  // Adaptive Card: accepted by Teams Workflows webhooks and classic
  // incoming webhooks.
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: msg.title,
              weight: 'Bolder',
              wrap: true,
            },
            { type: 'TextBlock', text: msg.message, wrap: true },
          ],
          ...(link
            ? {
                actions: [
                  {
                    type: 'Action.OpenUrl',
                    title: 'Open in TestSphere',
                    url: link,
                  },
                ],
              }
            : {}),
        },
      },
    ],
  };
}

// Posts one message. Returns an error string, or null on success.
export async function postWebhook(
  provider: WebhookProvider,
  url: string,
  msg: OutgoingMessage,
): Promise<string | null> {
  try {
    validateWebhookUrl(provider, url);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookBody(provider, msg)),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return `The webhook answered HTTP ${response.status}.`;
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message.slice(0, 200)
      : 'Delivery failed.';
  }
}

// ---------------------------------------------------------------- email

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let transport: nodemailer.Transporter | null = null;
function mailTransport(): nodemailer.Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure:
        (
          process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')
        ).toLowerCase() === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
        : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transport;
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
}

// Sends one email. Returns an error string, or null on success.
export async function sendEmail(
  to: string[],
  msg: OutgoingMessage,
): Promise<string | null> {
  if (!smtpConfigured())
    return 'Email is not configured (SMTP_HOST / SMTP_FROM).';
  if (to.length === 0) return null;
  const link = absoluteLink(msg.link);
  try {
    await mailTransport().sendMail({
      from: process.env.SMTP_FROM,
      // Recipients go in BCC so they do not see each other's addresses.
      to: process.env.SMTP_FROM,
      bcc: to,
      subject: `[TestSphere] ${msg.title}`,
      text: `${msg.message}${link ? `\n\nOpen in TestSphere: ${link}` : ''}`,
      html: `<p><strong>${escapeHtml(msg.title)}</strong></p><p>${escapeHtml(msg.message)}</p>${
        link
          ? `<p><a href="${escapeHtml(link)}">Open in TestSphere</a></p>`
          : ''
      }`,
    });
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message.slice(0, 200)
      : 'Email delivery failed.';
  }
}

export async function recordEmailStatus(
  prisma: PrismaService,
  error: string | null,
) {
  const value = {
    lastStatus: error ? 'FAILED' : 'OK',
    lastError: error,
    lastDeliveredAt: new Date().toISOString(),
    fingerprint: smtpFingerprint(),
  };
  await prisma.platformConfiguration.upsert({
    where: { key: EMAIL_STATUS_KEY },
    create: { key: EMAIL_STATUS_KEY, value },
    update: { value },
  });
}

// Identifies the current SMTP settings (no secrets): a result recorded for
// different settings no longer counts, so changing SMTP never keeps a stale
// "Connected".
function smtpFingerprint() {
  return createHash('sha256')
    .update(
      [
        process.env.SMTP_HOST,
        process.env.SMTP_PORT,
        process.env.SMTP_USER,
        process.env.SMTP_FROM,
      ].join('|'),
    )
    .digest('hex')
    .slice(0, 16);
}

export async function readEmailStatus(prisma: PrismaService) {
  const row = await prisma.platformConfiguration.findUnique({
    where: { key: EMAIL_STATUS_KEY },
  });
  const value = row?.value as {
    lastStatus: 'OK' | 'FAILED';
    lastError: string | null;
    lastDeliveredAt: string;
    fingerprint?: string;
  } | null;
  if (!value || value.fingerprint !== smtpFingerprint()) return null;
  return value;
}

// ---------------------------------------------------------------- recipients

export type RecipientSpec =
  | { kind: 'users'; userIds: string[] }
  | { kind: 'permission'; permission: string }
  | { kind: 'approval'; approval: ApprovalKey };

async function roleIdsWithPermission(
  prisma: PrismaService,
  permission: string,
): Promise<string[]> {
  const roles = await prisma.role.findMany({
    where: { rolePermissions: { some: { permission: { key: permission } } } },
    select: { id: true },
  });
  return roles.map((r) => r.id);
}

async function resolveRoleIds(
  prisma: PrismaService,
  event: NotificationEvent,
  spec: RecipientSpec,
  config: NotificationConfig,
): Promise<string[] | null> {
  if (spec.kind === 'users') return null;
  const configured = config.recipientRoleIds?.[event] ?? [];
  if (configured.length > 0) return configured;
  if (spec.kind === 'permission')
    return roleIdsWithPermission(prisma, spec.permission);
  const policy = await readJson<ApprovalPolicy>(
    prisma,
    CONFIG_KEYS.approval(spec.approval),
    defaultApproval(spec.approval),
  );
  if (policy.approverRoleIds?.length) return policy.approverRoleIds;
  return roleIdsWithPermission(prisma, APPROVAL_PERMISSION[spec.approval]);
}

interface Recipient {
  id: string;
  email: string;
  emailNotificationsEnabled: boolean;
}

async function resolveRecipients(
  prisma: PrismaService,
  event: NotificationEvent,
  spec: RecipientSpec,
  config: NotificationConfig,
  organizationId: string | null | undefined,
  excludeUserId?: string,
): Promise<Recipient[]> {
  const roleIds = await resolveRoleIds(prisma, event, spec, config);
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      ...(roleIds
        ? { roleId: { in: roleIds } }
        : { id: { in: spec.kind === 'users' ? spec.userIds : [] } }),
      // Tenant isolation: only people in the item's organization, plus
      // platform-level users who are not assigned to any organization.
      ...(organizationId
        ? { OR: [{ organizationId }, { organizationId: null }] }
        : {}),
    },
    select: { id: true, email: true, emailNotificationsEnabled: true },
  });
  return users.filter((u) => u.id !== excludeUserId);
}

// ---------------------------------------------------------------- notify

export interface NotifyInput extends OutgoingMessage {
  event: NotificationEvent;
  recipients: RecipientSpec;
  organizationId?: string | null;
  entityType?: string;
  entityId?: string;
  // Stops repeats: one notification per recipient per key.
  dedupeKey?: string;
  // The person who caused the event is not notified about their own action.
  actorUserId?: string;
}

export interface NotifyResult {
  inApp: number;
  email: number;
  webhooks: number;
  errors: string[];
}

export async function notify(
  prisma: PrismaService,
  input: NotifyInput,
): Promise<NotifyResult> {
  const result: NotifyResult = { inApp: 0, email: 0, webhooks: 0, errors: [] };
  try {
    if (!NOTIFICATION_EVENTS.includes(input.event)) return result;
    const config = await readNotificationConfig(prisma);
    const channels = new Set<NotificationChannel>(
      config.routing[input.event] ?? [],
    );
    if (channels.size === 0) return result;

    const recipients = await resolveRecipients(
      prisma,
      input.event,
      input.recipients,
      config,
      input.organizationId,
      input.actorUserId,
    );

    // A dedupe key also suppresses the email / webhook copies: only
    // recipients who did not already get this notification are counted.
    let fresh = recipients;
    if (input.dedupeKey && recipients.length > 0) {
      const existing = await prisma.notification.findMany({
        where: {
          dedupeKey: input.dedupeKey,
          userId: { in: recipients.map((r) => r.id) },
        },
        select: { userId: true },
      });
      const seen = new Set(existing.map((n) => n.userId));
      fresh = recipients.filter((r) => !seen.has(r.id));
    }
    if (fresh.length === 0) return result;

    // The in-app row doubles as the delivery record for dedupe, so it is
    // always written when a dedupe key is used, even if IN_APP is off
    // (it is then created already read, so it does not show as unread).
    if (channels.has('IN_APP') || input.dedupeKey) {
      const created = await prisma.notification.createMany({
        data: fresh.map((r) => ({
          userId: r.id,
          event: input.event,
          title: input.title.slice(0, 200),
          message: input.message.slice(0, 1000),
          link: input.link ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          dedupeKey: input.dedupeKey ?? null,
          readAt: channels.has('IN_APP') ? null : new Date(),
        })),
        skipDuplicates: true,
      });
      if (channels.has('IN_APP')) result.inApp = created.count;
    }

    if (channels.has('EMAIL') && smtpConfigured()) {
      const to = fresh
        .filter((r) => r.emailNotificationsEnabled && r.email)
        .map((r) => r.email);
      if (to.length > 0) {
        const error = await sendEmail(to, input);
        await recordEmailStatus(prisma, error);
        if (error) result.errors.push(`Email: ${error}`);
        else result.email = to.length;
      }
    }

    if (channels.has('TEAMS_SLACK')) {
      const webhooks = await readWebhooks(prisma);
      const targets = webhooks.filter(
        (w) =>
          w.enabled &&
          w.events.includes(input.event) &&
          // Tenant isolation for channels, same as for people.
          (!w.organizationId || w.organizationId === input.organizationId),
      );
      if (targets.length > 0) {
        const outcomes = await Promise.all(
          targets.map(async (w) => {
            const url = decryptSecret(w.urlSealed);
            const error = url
              ? await postWebhook(w.provider, url, input)
              : 'Stored URL could not be decrypted.';
            return { id: w.id, urlSealed: w.urlSealed, error };
          }),
        );
        await recordWebhookOutcomes(prisma, outcomes);
        for (const o of outcomes) {
          if (o.error) result.errors.push(`Webhook: ${o.error}`);
          else result.webhooks += 1;
        }
      }
    }
  } catch (error) {
    logger.error(`Notification delivery failed: ${String(error)}`);
    result.errors.push('Delivery failed.');
  }
  return result;
}
