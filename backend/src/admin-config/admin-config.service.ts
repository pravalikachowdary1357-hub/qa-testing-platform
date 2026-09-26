import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AiProviderService } from '../ai/ai-provider.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  APPROVAL_KEYS,
  APPROVAL_LABELS,
  APPROVAL_LOCKED_REJECT_COMMENT,
  CONFIG_KEYS,
  DASHBOARD_SECTIONS,
  DASHBOARD_SECTION_LABELS,
  DEFAULT_DASHBOARD,
  DEFAULT_RETENTION,
  WORKFLOW_KEYS,
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
  defaultApproval,
  APPROVAL_PERMISSION,
  defaultWorkflow,
} from './admin-config.constants';
import type {
  ApprovalKey,
  ApprovalPolicy,
  DashboardConfig,
  DataRetentionConfig,
  WorkflowConfig,
  WorkflowKey,
} from './admin-config.constants';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { UpdateApprovalPolicyDto } from './dto/update-approval-policy.dto';
import { UpdateDashboardConfigDto } from './dto/update-dashboard-config.dto';
import { UpdateDataRetentionDto } from './dto/update-data-retention.dto';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import {
  readEmailStatus,
  readNotificationConfig,
  readWebhooks,
  smtpConfigured,
} from '../notifications/notification-delivery';
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_DEFAULT_RECIPIENTS,
} from './admin-config.constants';
import type { NotificationConfig } from './admin-config.constants';

type PrismaLike = Pick<PrismaService, 'platformConfiguration'>;

async function readConfig<T>(
  prisma: PrismaLike,
  key: string,
  fallback: T,
): Promise<T> {
  const row = await prisma.platformConfiguration.findUnique({ where: { key } });
  return row ? { ...fallback, ...(row.value as object) } : fallback;
}

// ---- Enforcement helpers used by existing modules (Defects, Test Cases,
// Requirements, UAT, Release Quality). They read configuration straight
// from the database so those modules need no new DI wiring, and with no
// configuration saved they are no-ops (the defaults allow everything the
// app already allowed).

export async function assertWorkflowTransition(
  prisma: PrismaLike,
  key: WorkflowKey,
  from: string,
  to: string | undefined,
): Promise<void> {
  if (!to || to === from) return;
  const config = await readConfig(
    prisma,
    CONFIG_KEYS.workflow(key),
    defaultWorkflow(key),
  );
  if (!config.enforced) return;
  // A defect workflow saved before the "New" status existed has no
  // transitions for it; new defects then follow the rules for OPEN (the
  // status "New" replaced as the starting point), so they are not stuck.
  const mentionsNew = config.transitions.some(
    (t) => t.from === 'NEW' || t.to === 'NEW',
  );
  const effectiveFrom =
    key === 'DEFECT' && from === 'NEW' && !mentionsNew ? 'OPEN' : from;
  const allowed = config.transitions.some(
    (t) => t.from === effectiveFrom && t.to === to,
  );
  if (!allowed) {
    throw new BadRequestException(
      `${WORKFLOW_LABELS[key]}: moving from ${from} to ${to} is not allowed by the configured workflow.`,
    );
  }
}

// Enforces the configured approval rules for one decision: the actor's role
// must be an allowed approver (when approver roles are configured) and a
// comment must be present when the policy requires it.
export async function assertApprovalComment(
  prisma: PrismaLike,
  key: ApprovalKey,
  decision: string,
  comment: string | null | undefined,
  actor?: { roleId: string },
): Promise<void> {
  const policy = await readConfig(
    prisma,
    CONFIG_KEYS.approval(key),
    defaultApproval(key),
  );
  const approverRoleIds = policy.approverRoleIds ?? [];
  if (
    actor &&
    approverRoleIds.length > 0 &&
    !approverRoleIds.includes(actor.roleId)
  ) {
    throw new ForbiddenException(
      `${APPROVAL_LABELS[key]}: your role is not an approver for this decision.`,
    );
  }
  const approving = decision === 'APPROVED';
  const required = approving
    ? policy.requireCommentOnApprove
    : policy.requireCommentOnReject;
  if (required && !comment?.trim()) {
    throw new BadRequestException(
      `${APPROVAL_LABELS[key]}: a comment is required when ${approving ? 'approving' : 'rejecting'}.`,
    );
  }
}

@Injectable()
export class AdminConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly aiProvider: AiProviderService,
  ) {}

  private async save(
    key: string,
    value: object,
    actor: AuthenticatedUser,
    summary: string,
  ) {
    const json = value as Prisma.InputJsonValue;
    await this.prisma.platformConfiguration.upsert({
      where: { key },
      update: { value: json, updatedByUserId: actor.id },
      create: { key, value: json, updatedByUserId: actor.id },
    });
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'platform_config.updated',
      entityType: 'PlatformConfiguration',
      entityId: key,
      summary,
      metadata: value as Record<string, unknown>,
    });
  }

  // ---------------- Workflows ----------------

  async listWorkflows() {
    return Promise.all(
      WORKFLOW_KEYS.map(async (key) => ({
        key,
        label: WORKFLOW_LABELS[key],
        statuses: WORKFLOW_STATUSES[key],
        ...(await readConfig<WorkflowConfig>(
          this.prisma,
          CONFIG_KEYS.workflow(key),
          defaultWorkflow(key),
        )),
      })),
    );
  }

  async updateWorkflow(
    key: string,
    dto: UpdateWorkflowDto,
    actor: AuthenticatedUser,
  ) {
    if (!WORKFLOW_KEYS.includes(key as WorkflowKey)) {
      throw new NotFoundException(`Unknown workflow ${key}`);
    }
    const workflowKey = key as WorkflowKey;
    const statuses = WORKFLOW_STATUSES[workflowKey];
    const seen = new Set<string>();
    const transitions: WorkflowConfig['transitions'] = [];
    for (const t of dto.transitions) {
      if (!statuses.includes(t.from) || !statuses.includes(t.to)) {
        throw new BadRequestException(
          `Unknown status in transition ${t.from} -> ${t.to}.`,
        );
      }
      if (t.from === t.to) {
        throw new BadRequestException(
          `A status cannot transition to itself (${t.from}).`,
        );
      }
      const id = `${t.from}>${t.to}`;
      if (!seen.has(id)) {
        seen.add(id);
        transitions.push({ from: t.from, to: t.to });
      }
    }
    // An enforced workflow must leave every status reachable-from and
    // leave-able, otherwise records could get stuck with no way out.
    if (dto.enforced) {
      const stuck = statuses.filter(
        (s) => !transitions.some((t) => t.from === s || t.to === s),
      );
      if (stuck.length) {
        throw new BadRequestException(
          `Every status needs at least one transition when the workflow is enforced (missing: ${stuck.join(', ')}).`,
        );
      }
    }
    const value: WorkflowConfig = { enforced: dto.enforced, transitions };
    await this.save(
      CONFIG_KEYS.workflow(workflowKey),
      value,
      actor,
      `Updated ${WORKFLOW_LABELS[workflowKey]} (${transitions.length} transition(s), ${dto.enforced ? 'enforced' : 'not enforced'}).`,
    );
    return (await this.listWorkflows()).find((w) => w.key === workflowKey);
  }

  // ---------------- Approval workflows ----------------

  async listApprovalPolicies() {
    return Promise.all(
      APPROVAL_KEYS.map(async (key) => ({
        key,
        label: APPROVAL_LABELS[key],
        rejectCommentLocked: APPROVAL_LOCKED_REJECT_COMMENT[key],
        permission: APPROVAL_PERMISSION[key],
        ...(await readConfig<ApprovalPolicy>(
          this.prisma,
          CONFIG_KEYS.approval(key),
          defaultApproval(key),
        )),
      })),
    );
  }

  async updateApprovalPolicy(
    key: string,
    dto: UpdateApprovalPolicyDto,
    actor: AuthenticatedUser,
  ) {
    if (!APPROVAL_KEYS.includes(key as ApprovalKey)) {
      throw new NotFoundException(`Unknown approval workflow ${key}`);
    }
    const approvalKey = key as ApprovalKey;
    if (
      APPROVAL_LOCKED_REJECT_COMMENT[approvalKey] &&
      !dto.requireCommentOnReject
    ) {
      throw new BadRequestException(
        `${APPROVAL_LABELS[approvalKey]} always requires a comment when rejecting.`,
      );
    }
    const approverRoleIds = [...new Set(dto.approverRoleIds ?? [])];
    if (approverRoleIds.length > 0) {
      const permissionKey = APPROVAL_PERMISSION[approvalKey];
      const roles = await this.prisma.role.findMany({
        where: { id: { in: approverRoleIds } },
        select: {
          id: true,
          name: true,
          rolePermissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      });
      if (roles.length !== approverRoleIds.length) {
        throw new BadRequestException(
          'One or more approver roles do not exist.',
        );
      }
      const lacking = roles.filter(
        (r) =>
          !r.rolePermissions.some((rp) => rp.permission.key === permissionKey),
      );
      if (lacking.length > 0) {
        throw new BadRequestException(
          `${lacking.map((r) => r.name).join(', ')} cannot approve: the role lacks the "${permissionKey}" permission.`,
        );
      }
    }
    const value: ApprovalPolicy = {
      requireCommentOnApprove: dto.requireCommentOnApprove,
      requireCommentOnReject: dto.requireCommentOnReject,
      approverRoleIds,
    };
    await this.save(
      CONFIG_KEYS.approval(approvalKey),
      value,
      actor,
      `Updated ${APPROVAL_LABELS[approvalKey]} approval rules.`,
    );
    return (await this.listApprovalPolicies()).find(
      (p) => p.key === approvalKey,
    );
  }

  // ---------------- Dashboard ----------------

  // Every signed-in user gets the effective layout for their own role;
  // administrators (dashboards:manage) also get the global layout and every
  // per-role override so they can edit them.
  async getDashboardConfig(actor: AuthenticatedUser) {
    const config = await readConfig<DashboardConfig>(
      this.prisma,
      CONFIG_KEYS.dashboard,
      DEFAULT_DASHBOARD,
    );
    const overrides = config.roleOverrides ?? {};
    const effective = overrides[actor.roleId] ?? config.hiddenSections;
    const canManage = actor.permissions.includes('dashboards:manage');
    return {
      hiddenSections: effective,
      ...(canManage
        ? {
            globalHiddenSections: config.hiddenSections,
            roleOverrides: overrides,
          }
        : {}),
      sections: DASHBOARD_SECTIONS.map((key) => ({
        key,
        label: DASHBOARD_SECTION_LABELS[key],
      })),
    };
  }

  async updateDashboardConfig(
    dto: UpdateDashboardConfigDto,
    actor: AuthenticatedUser,
  ) {
    const current = await readConfig<DashboardConfig>(
      this.prisma,
      CONFIG_KEYS.dashboard,
      DEFAULT_DASHBOARD,
    );
    let roleName: string | null = null;
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) throw new NotFoundException(`Role ${dto.roleId} not found`);
      roleName = role.name;
    }
    const value: DashboardConfig = dto.roleId
      ? {
          hiddenSections: current.hiddenSections,
          roleOverrides: {
            ...(current.roleOverrides ?? {}),
            [dto.roleId]: dto.hiddenSections,
          },
        }
      : {
          hiddenSections: dto.hiddenSections,
          roleOverrides: current.roleOverrides ?? {},
        };
    await this.save(
      CONFIG_KEYS.dashboard,
      value,
      actor,
      roleName
        ? `Updated dashboard layout for role "${roleName}" (${dto.hiddenSections.length} section(s) hidden).`
        : `Updated default dashboard layout (${dto.hiddenSections.length} section(s) hidden).`,
    );
    return this.getDashboardConfig(actor);
  }

  async clearDashboardRoleOverride(roleId: string, actor: AuthenticatedUser) {
    const current = await readConfig<DashboardConfig>(
      this.prisma,
      CONFIG_KEYS.dashboard,
      DEFAULT_DASHBOARD,
    );
    const overrides = { ...(current.roleOverrides ?? {}) };
    delete overrides[roleId];
    await this.save(
      CONFIG_KEYS.dashboard,
      { hiddenSections: current.hiddenSections, roleOverrides: overrides },
      actor,
      'Removed a role-specific dashboard layout.',
    );
    return this.getDashboardConfig(actor);
  }

  // ---------------- Notifications ----------------

  async getNotificationConfig() {
    const config = await readNotificationConfig(this.prisma);
    const webhooks = await readWebhooks(this.prisma);
    const enabledWebhooks = webhooks.filter((w) => w.enabled).length;
    // Delivery is implemented for every channel; `available` says whether a
    // channel can deliver right now (email needs SMTP settings, Teams/Slack
    // needs at least one enabled webhook).
    const availability: Record<string, { available: boolean; detail: string }> =
      {
        IN_APP: { available: true, detail: 'Shown in the notification bell.' },
        EMAIL: smtpConfigured()
          ? {
              available: true,
              detail: `Sent from ${process.env.SMTP_FROM} to users who allow email notifications.`,
            }
          : {
              available: false,
              detail:
                'Not configured: set SMTP_HOST and SMTP_FROM in the backend environment.',
            },
        TEAMS_SLACK:
          enabledWebhooks > 0
            ? {
                available: true,
                detail: `${enabledWebhooks} enabled webhook(s) under Settings > Integrations.`,
              }
            : {
                available: false,
                detail:
                  'No enabled webhook: add one under Settings > Integrations.',
              },
      };
    return {
      ...config,
      deliveryImplemented: true,
      // The daily reminder run (Vercel Cron) only works once CRON_SECRET is
      // set; without it the cron endpoint refuses to run.
      dailyScheduleEnabled: Boolean(process.env.CRON_SECRET),
      channels: NOTIFICATION_CHANNELS.map((key) => ({
        key,
        label: NOTIFICATION_CHANNEL_LABELS[key],
        ...availability[key],
      })),
      events: NOTIFICATION_EVENTS.map((key) => ({
        key,
        label: NOTIFICATION_EVENT_LABELS[key],
        defaultRecipients: NOTIFICATION_DEFAULT_RECIPIENTS[key],
      })),
    };
  }

  async updateNotificationConfig(
    dto: UpdateNotificationConfigDto,
    actor: AuthenticatedUser,
  ) {
    const routing = { ...DEFAULT_NOTIFICATIONS.routing };
    for (const [event, channels] of Object.entries(dto.routing ?? {})) {
      if (!NOTIFICATION_EVENTS.includes(event as never)) {
        throw new BadRequestException(`Unknown notification event ${event}.`);
      }
      if (
        !Array.isArray(channels) ||
        channels.some((c) => !NOTIFICATION_CHANNELS.includes(c as never))
      ) {
        throw new BadRequestException(`Invalid channels for ${event}.`);
      }
      routing[event as keyof typeof routing] = [...new Set(channels)] as never;
    }
    const recipientRoleIds: NotificationConfig['recipientRoleIds'] = {};
    const requestedRoles = dto.recipientRoleIds ?? {};
    const allRoleIds = [...new Set(Object.values(requestedRoles).flat())];
    if (allRoleIds.length > 0) {
      const found = await this.prisma.role.count({
        where: { id: { in: allRoleIds } },
      });
      if (found !== allRoleIds.length) {
        throw new BadRequestException(
          'One or more recipient roles do not exist.',
        );
      }
    }
    for (const [event, roleIds] of Object.entries(requestedRoles)) {
      if (!NOTIFICATION_EVENTS.includes(event as never)) {
        throw new BadRequestException(`Unknown notification event ${event}.`);
      }
      if (event === 'ASSIGNMENT') continue; // always the assigned person
      if (!Array.isArray(roleIds))
        throw new BadRequestException(`Invalid recipients for ${event}.`);
      if (roleIds.length > 0) {
        recipientRoleIds[event as keyof typeof recipientRoleIds] = [
          ...new Set(roleIds),
        ];
      }
    }
    const value: NotificationConfig = {
      routing,
      recipientRoleIds,
      escalationAfterDays: dto.escalationAfterDays ?? null,
      reminderDaysBeforeDue: dto.reminderDaysBeforeDue ?? null,
    };
    await this.save(
      CONFIG_KEYS.notifications,
      value,
      actor,
      'Updated notification configuration.',
    );
    return this.getNotificationConfig();
  }

  // Communication integrations are real: their status comes from actual
  // deliveries, so "Connected" only ever appears after a message was
  // really delivered (a test message or a notification).
  private async communicationIntegrations() {
    const webhooks = await readWebhooks(this.prisma);
    const webhookStatus = (provider: 'TEAMS' | 'SLACK') => {
      const mine = webhooks.filter((w) => w.provider === provider && w.enabled);
      if (mine.length === 0)
        return { status: 'NOT_CONFIGURED' as const, count: 0 };
      // Connected only when every enabled webhook's last delivery succeeded.
      if (mine.some((w) => w.lastStatus === 'FAILED'))
        return { status: 'ERROR' as const, count: mine.length };
      if (mine.every((w) => w.lastStatus === 'OK'))
        return { status: 'CONNECTED' as const, count: mine.length };
      return { status: 'CONFIGURED' as const, count: mine.length };
    };
    const email = await readEmailStatus(this.prisma);
    const emailStatus = !smtpConfigured()
      ? ('NOT_CONFIGURED' as const)
      : !email
        ? ('CONFIGURED' as const)
        : email.lastStatus === 'OK'
          ? ('CONNECTED' as const)
          : ('ERROR' as const);
    const teams = webhookStatus('TEAMS');
    const slack = webhookStatus('SLACK');
    return [
      {
        key: 'IN_APP_NOTIFICATIONS',
        category: 'Communication',
        name: 'In-app notifications',
        level: 'IMPLEMENTED' as const,
        status: 'CONNECTED' as const,
        description:
          'Notifications appear in the bell in the header for each recipient.',
      },
      {
        key: 'COMMUNICATION_MICROSOFT_TEAMS',
        category: 'Communication',
        name: 'Microsoft Teams',
        level: 'IMPLEMENTED' as const,
        status: teams.status,
        description:
          'Posts notifications to Teams channels through incoming / Workflows webhooks.',
        details: { webhooks: teams.count },
        configuredVia: 'Settings > Integrations > Teams / Slack webhooks',
      },
      {
        key: 'COMMUNICATION_SLACK',
        category: 'Communication',
        name: 'Slack',
        level: 'IMPLEMENTED' as const,
        status: slack.status,
        description:
          'Posts notifications to Slack channels through incoming webhooks.',
        details: { webhooks: slack.count },
        configuredVia: 'Settings > Integrations > Teams / Slack webhooks',
      },
      {
        key: 'COMMUNICATION_EMAIL',
        category: 'Communication',
        name: 'Email (SMTP)',
        level: 'IMPLEMENTED' as const,
        status: emailStatus,
        description:
          'Sends notification emails to users who allow email notifications.',
        details: email?.lastError ? { lastError: email.lastError } : undefined,
        configuredVia:
          'Environment variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE',
      },
    ];
  }

  // ---------------- Integrations (status) ----------------

  // Only integrations the codebase genuinely implements are listed. Their
  // secrets live in deployment environment variables and are never exposed
  // or editable here.
  // Integration targets from Requirements section 27. Only the AI assistant
  // is implemented; the Development category additionally has a reference
  // link foundation (Product.repositoryUrl, a stored URL only -- no API
  // calls). Everything else is reported as a future integration; nothing is
  // ever shown as connected unless it really is.
  async listIntegrations() {
    const aiEnabled =
      (process.env.AI_FEATURES_ENABLED ?? 'true').toLowerCase() !== 'false';
    const configured = this.aiProvider.isConfigured();
    const productsWithRepo = await this.prisma.product.count({
      where: { repositoryUrl: { not: null } },
    });
    const future = (category: string, names: string[]) =>
      names.map((name) => ({
        key: `${category}_${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        category,
        name,
        level: 'FUTURE' as const,
        status: 'NOT_AVAILABLE' as const,
        description:
          'Listed in the TestSphere requirements; no connector exists yet.',
      }));
    return [
      {
        key: 'AI_PROVIDER',
        category: 'AI',
        name: 'AI assistant (Anthropic Claude)',
        level: 'IMPLEMENTED' as const,
        description:
          'Powers AI test-scenario / test-case generation, defect assistance and insights.',
        status: !aiEnabled
          ? ('DISABLED' as const)
          : configured
            ? ('CONNECTED' as const)
            : ('NOT_CONFIGURED' as const),
        details: {
          model: this.aiProvider.getModelName(),
          featuresEnabled: aiEnabled,
        },
        configuredVia:
          'Environment variables ANTHROPIC_API_KEY, ANTHROPIC_MODEL, AI_FEATURES_ENABLED',
      },
      {
        key: 'REPOSITORY_LINKS',
        category: 'Development',
        name: 'Product repository links',
        level: 'FOUNDATION' as const,
        status: 'REFERENCE_ONLY' as const,
        description:
          'Each product can store its source repository URL (Products > edit). It is a link only; TestSphere does not call the repository.',
        details: { productsWithRepositoryUrl: productsWithRepo },
      },
      ...future('Development', [
        'GitHub',
        'GitLab',
        'Bitbucket',
        'Azure DevOps',
      ]),
      ...future('Issue tracking', ['Jira']),
      ...future('CI/CD', [
        'Jenkins',
        'GitHub Actions',
        'GitLab CI/CD',
        'Azure Pipelines',
      ]),
      ...(await this.communicationIntegrations()),
      ...future('Automation', [
        'Selenium',
        'Playwright',
        'Cypress',
        'Appium',
        'Postman/Newman',
        'JMeter',
      ]),
    ];
  }

  // ---------------- Data retention ----------------

  async getDataRetention() {
    const config = await readConfig<DataRetentionConfig>(
      this.prisma,
      CONFIG_KEYS.retention,
      DEFAULT_RETENTION,
    );
    const olderThan = (days: number | null) =>
      days === null ? null : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const auditCutoff = olderThan(config.auditLogRetentionDays);
    const aiCutoff = olderThan(config.aiHistoryRetentionDays);
    const sessionCutoff = olderThan(config.expiredSessionRetentionDays);
    const documentCutoff = olderThan(config.documentRetentionDays ?? null);
    const docWhere = documentCutoff
      ? { createdAt: { lt: documentCutoff } }
      : null;
    const documentCounts = docWhere
      ? await Promise.all([
          this.prisma.productDocument.count({ where: docWhere }),
          this.prisma.organizationDocument.count({ where: docWhere }),
          this.prisma.requirementAttachment.count({ where: docWhere }),
        ])
      : [0, 0, 0];
    const [auditOverdue, aiOverdue, sessionsOverdue] = await Promise.all([
      auditCutoff
        ? this.prisma.auditLog.count({
            where: { createdAt: { lt: auditCutoff } },
          })
        : 0,
      aiCutoff
        ? this.prisma.aiSuggestion.count({
            where: { createdAt: { lt: aiCutoff } },
          })
        : 0,
      sessionCutoff
        ? this.prisma.session.count({
            where: { expiresAt: { lt: sessionCutoff } },
          })
        : 0,
    ]);
    return {
      ...config,
      automaticDeletionEnabled: false,
      recordsPastRetention: {
        auditLog: auditOverdue,
        aiHistory: aiOverdue,
        expiredSessions: sessionsOverdue,
        documents: documentCounts.reduce((a, b) => a + b, 0),
      },
      documentRetentionDays: config.documentRetentionDays ?? null,
    };
  }

  async updateDataRetention(
    dto: UpdateDataRetentionDto,
    actor: AuthenticatedUser,
  ) {
    const value: DataRetentionConfig = {
      auditLogRetentionDays: dto.auditLogRetentionDays ?? null,
      aiHistoryRetentionDays: dto.aiHistoryRetentionDays ?? null,
      expiredSessionRetentionDays: dto.expiredSessionRetentionDays ?? null,
      documentRetentionDays: dto.documentRetentionDays ?? null,
    };
    await this.save(
      CONFIG_KEYS.retention,
      value,
      actor,
      'Updated data-retention policy.',
    );
    return this.getDataRetention();
  }
}
