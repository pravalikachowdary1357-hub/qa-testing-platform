import type { PrismaService } from '../prisma.service';
import { notify, readNotificationConfig } from './notification-delivery';

// Daily notifications that depend on time rather than on a user action:
// approval reminders, escalations, test cycle / release due-date reminders
// and overdue alerts. Run by the Vercel cron (GET /notifications/cron) or
// by an administrator from Settings. Dedupe keys make it safe to run more
// than once a day: each item produces at most one notification per
// recipient per day (one ever for "due soon").

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 200;

export interface ScheduleSummary {
  approvalReminders: number;
  escalations: number;
  dueSoon: number;
  overdue: number;
}

export async function runScheduledNotifications(
  prisma: PrismaService,
  now = new Date(),
): Promise<ScheduleSummary> {
  const config = await readNotificationConfig(prisma);
  const today = now.toISOString().slice(0, 10);
  const summary: ScheduleSummary = {
    approvalReminders: 0,
    escalations: 0,
    dueSoon: 0,
    overdue: 0,
  };
  const count = (
    key: keyof ScheduleSummary,
    result: { inApp: number; email: number; webhooks: number },
  ) => {
    if (result.inApp + result.email + result.webhooks > 0) summary[key] += 1;
  };
  const waitingDays = (since: Date) =>
    Math.floor((now.getTime() - since.getTime()) / DAY_MS);

  // ---- Items waiting for approval ----
  const [requirements, uatCycles, releasesAwaiting] = await Promise.all([
    prisma.requirement.findMany({
      where: { status: 'IN_REVIEW' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        product: { select: { organizationId: true } },
      },
      take: MAX_ITEMS,
    }),
    prisma.uatCycle.findMany({
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        product: { select: { organizationId: true } },
      },
      take: MAX_ITEMS,
    }),
    prisma.release.findMany({
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        product: { select: { organizationId: true } },
      },
      take: MAX_ITEMS,
    }),
  ]);

  const waiting = [
    ...requirements.map((r) => ({
      type: 'Requirement',
      approval: 'REQUIREMENT_REVIEW' as const,
      label: `Requirement "${r.title}"`,
      link: '/requirements',
      id: r.id,
      since: r.updatedAt,
      organizationId: r.product.organizationId,
    })),
    ...uatCycles.map((c) => ({
      type: 'UatCycle',
      approval: 'UAT_SIGN_OFF' as const,
      label: `UAT cycle "${c.name}"`,
      link: '/uat',
      id: c.id,
      since: c.updatedAt,
      organizationId: c.product.organizationId,
    })),
    ...releasesAwaiting.map((r) => ({
      type: 'Release',
      approval: 'RELEASE_SIGN_OFF' as const,
      label: `Release "${r.name}"`,
      link: '/release-quality',
      id: r.id,
      since: r.updatedAt,
      organizationId: r.product.organizationId,
    })),
  ];

  for (const item of waiting) {
    const days = waitingDays(item.since);
    if (days < 1) continue; // just submitted: the immediate notification covers it
    count(
      'approvalReminders',
      await notify(prisma, {
        event: 'APPROVAL_REMINDER',
        recipients: { kind: 'approval', approval: item.approval },
        organizationId: item.organizationId,
        title: 'Approval still pending',
        message: `${item.label} has been waiting for approval for ${days} day(s).`,
        link: item.link,
        entityType: item.type,
        entityId: item.id,
        dedupeKey: `approval-reminder:${item.type}:${item.id}:${today}`,
      }),
    );
    if (config.escalationAfterDays && days >= config.escalationAfterDays) {
      count(
        'escalations',
        await notify(prisma, {
          event: 'ESCALATION',
          recipients: {
            kind: 'permission',
            permission: 'release_quality:approve',
          },
          organizationId: item.organizationId,
          title: 'Approval escalated',
          message: `${item.label} has waited ${days} day(s) for approval (escalation after ${config.escalationAfterDays}).`,
          link: item.link,
          entityType: item.type,
          entityId: item.id,
          dedupeKey: `escalation:${item.type}:${item.id}:${today}`,
        }),
      );
    }
  }

  // ---- Due dates: test plans and releases ----
  const reminderDays = config.reminderDaysBeforeDue ?? 0;
  const horizon = new Date(now.getTime() + reminderDays * DAY_MS);
  const [plans, releases] = await Promise.all([
    prisma.testPlan.findMany({
      where: {
        endDate: { not: null, lte: horizon },
        status: { notIn: ['COMPLETED', 'ARCHIVED'] },
      },
      select: {
        id: true,
        name: true,
        endDate: true,
        product: { select: { organizationId: true } },
      },
      take: MAX_ITEMS,
    }),
    prisma.release.findMany({
      where: {
        releaseDate: { not: null, lte: horizon },
        status: { in: ['PLANNED', 'IN_TESTING'] },
      },
      select: {
        id: true,
        name: true,
        releaseDate: true,
        product: { select: { organizationId: true } },
      },
      take: MAX_ITEMS,
    }),
  ]);

  const dated = [
    ...plans.map((p) => ({
      type: 'TestPlan',
      label: `Test plan "${p.name}"`,
      what: 'end date',
      link: '/test-planning',
      permission: 'test_plans:manage',
      id: p.id,
      due: p.endDate!,
      organizationId: p.product.organizationId,
    })),
    ...releases.map((r) => ({
      type: 'Release',
      label: `Release "${r.name}"`,
      what: 'release date',
      link: '/release-quality',
      permission: 'release_quality:manage',
      id: r.id,
      due: r.releaseDate!,
      organizationId: r.product.organizationId,
    })),
  ];

  for (const item of dated) {
    const dueDay = item.due.toISOString().slice(0, 10);
    if (item.due.getTime() < now.getTime() && dueDay < today) {
      count(
        'overdue',
        await notify(prisma, {
          event: 'OVERDUE_ALERT',
          recipients: { kind: 'permission', permission: item.permission },
          organizationId: item.organizationId,
          title: 'Overdue',
          message: `${item.label} is past its ${item.what} (${dueDay}) and is not finished.`,
          link: item.link,
          entityType: item.type,
          entityId: item.id,
          dedupeKey: `overdue:${item.type}:${item.id}:${today}`,
        }),
      );
    } else if (reminderDays > 0) {
      count(
        'dueSoon',
        await notify(prisma, {
          event: 'TEST_CYCLE_REMINDER',
          recipients: { kind: 'permission', permission: item.permission },
          organizationId: item.organizationId,
          title: 'Due soon',
          message: `${item.label} reaches its ${item.what} on ${dueDay}.`,
          link: item.link,
          entityType: item.type,
          entityId: item.id,
          dedupeKey: `due-soon:${item.type}:${item.id}:${dueDay}`,
        }),
      );
    }
  }

  return summary;
}
