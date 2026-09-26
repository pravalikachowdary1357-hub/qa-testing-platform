import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
  const allowed = config.transitions.some(
    (t) => t.from === from && t.to === to,
  );
  if (!allowed) {
    throw new BadRequestException(
      `${WORKFLOW_LABELS[key]}: moving from ${from} to ${to} is not allowed by the configured workflow.`,
    );
  }
}

export async function assertApprovalComment(
  prisma: PrismaLike,
  key: ApprovalKey,
  decision: string,
  comment: string | null | undefined,
): Promise<void> {
  const policy = await readConfig(
    prisma,
    CONFIG_KEYS.approval(key),
    defaultApproval(key),
  );
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
    const value: ApprovalPolicy = {
      requireCommentOnApprove: dto.requireCommentOnApprove,
      requireCommentOnReject: dto.requireCommentOnReject,
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

  async getDashboardConfig() {
    const config = await readConfig<DashboardConfig>(
      this.prisma,
      CONFIG_KEYS.dashboard,
      DEFAULT_DASHBOARD,
    );
    return {
      ...config,
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
    await this.save(
      CONFIG_KEYS.dashboard,
      { hiddenSections: dto.hiddenSections },
      actor,
      `Updated dashboard layout (${dto.hiddenSections.length} section(s) hidden).`,
    );
    return this.getDashboardConfig();
  }

  // ---------------- Integrations (read-only status) ----------------

  // Only integrations the codebase genuinely implements are listed. Their
  // secrets live in deployment environment variables and are never exposed
  // or editable here.
  listIntegrations() {
    const aiEnabled =
      (process.env.AI_FEATURES_ENABLED ?? 'true').toLowerCase() !== 'false';
    const configured = this.aiProvider.isConfigured();
    return [
      {
        key: 'AI_PROVIDER',
        name: 'AI assistant (Anthropic Claude)',
        description:
          'Powers AI test-scenario / test-case generation, defect assistance and insights.',
        status: !aiEnabled
          ? 'DISABLED'
          : configured
            ? 'CONNECTED'
            : 'NOT_CONFIGURED',
        details: {
          model: this.aiProvider.getModelName(),
          featuresEnabled: aiEnabled,
        },
        configuredVia:
          'Environment variables ANTHROPIC_API_KEY, ANTHROPIC_MODEL, AI_FEATURES_ENABLED',
      },
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
      },
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
