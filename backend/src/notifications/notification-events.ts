import type { PrismaService } from '../prisma.service';
import { notify } from './notification-delivery';

// The business events that produce notifications. Each helper is called
// after the change is saved and never throws (notify() swallows errors).

interface Actor {
  id: string;
  name?: string;
}

const SEVERE = new Set(['CRITICAL', 'MAJOR']);

// Defect "assigned to" is free text. It becomes a notification only when it
// names a real, active user exactly (email, or full name when that name is
// unique), so a typo never notifies the wrong person.
async function findAssignee(
  prisma: PrismaService,
  assignedTo: string | null | undefined,
  organizationId: string | null,
) {
  const value = assignedTo?.trim();
  if (!value) return null;
  const scope = organizationId
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : {};
  const byEmail = await prisma.user.findFirst({
    where: {
      email: { equals: value, mode: 'insensitive' },
      status: 'ACTIVE',
      ...scope,
    },
    select: { id: true },
  });
  if (byEmail) return byEmail.id;
  const byName = await prisma.user.findMany({
    where: {
      name: { equals: value, mode: 'insensitive' },
      status: 'ACTIVE',
      ...scope,
    },
    select: { id: true },
    take: 2,
  });
  return byName.length === 1 ? byName[0].id : null;
}

export async function notifyRequirementChange(
  prisma: PrismaService,
  actor: Actor,
  before: { status: string; ownerId: string | null } | null,
  after: {
    id: string;
    title: string;
    status: string;
    ownerId: string | null;
    product: { organizationId: string | null };
  },
) {
  try {
    const organizationId = after.product.organizationId;
    if (after.ownerId && after.ownerId !== before?.ownerId) {
      await notify(prisma, {
        event: 'ASSIGNMENT',
        recipients: { kind: 'users', userIds: [after.ownerId] },
        organizationId,
        actorUserId: actor.id,
        title: 'Requirement assigned to you',
        message: `You are now the owner of requirement "${after.title}".`,
        link: '/requirements',
        entityType: 'Requirement',
        entityId: after.id,
      });
    }
    if (after.status === 'IN_REVIEW' && before?.status !== 'IN_REVIEW') {
      await notify(prisma, {
        event: 'APPROVAL_REMINDER',
        recipients: { kind: 'approval', approval: 'REQUIREMENT_REVIEW' },
        organizationId,
        actorUserId: actor.id,
        title: 'Requirement waiting for review',
        message: `Requirement "${after.title}" was submitted for review.`,
        link: '/requirements',
        entityType: 'Requirement',
        entityId: after.id,
      });
    }
  } catch {
    // Notifications are best effort: never fail the saved change.
  }
}

// The three "Notification Preferences" switches in Application Settings.
async function appFlags(prisma: PrismaService) {
  const row = await prisma.appSetting.findFirst({
    orderBy: { updatedAt: 'asc' },
  });
  return {
    defectCreated: row?.notifyOnDefectCreated ?? true,
    readinessChange: row?.notifyOnReleaseReadinessChange ?? true,
    executionFailure: row?.notifyOnTestExecutionFailure ?? true,
  };
}

export async function notifyDefectChange(
  prisma: PrismaService,
  actor: Actor,
  before: {
    status: string;
    severity: string;
    assignedTo: string | null;
  } | null,
  after: {
    id: string;
    title: string;
    status: string;
    severity: string;
    assignedTo: string | null;
    product: { organizationId: string | null };
  },
) {
  try {
    const organizationId = after.product.organizationId;
    // New defects follow the "Notify when a new defect is created" setting;
    // a defect later raised to critical/major, or reopened, always notifies.
    const created = !before && (await appFlags(prisma)).defectCreated;
    const becameSevere =
      before !== null &&
      SEVERE.has(after.severity) &&
      !SEVERE.has(before.severity);
    const reopened =
      after.status === 'REOPENED' && before?.status !== 'REOPENED';
    if (created || becameSevere || reopened) {
      const severityLabel =
        after.severity.charAt(0) + after.severity.slice(1).toLowerCase();
      const what = reopened
        ? 'reopened'
        : before
          ? `raised to ${after.severity.toLowerCase()}`
          : `reported (${after.severity.toLowerCase()})`;
      await notify(prisma, {
        event: 'DEFECT',
        recipients: { kind: 'permission', permission: 'defects:manage' },
        organizationId,
        actorUserId: actor.id,
        title: reopened
          ? 'Defect reopened'
          : created
            ? `New ${severityLabel.toLowerCase()} defect`
            : `${severityLabel} defect`,
        message: `Defect "${after.title}" was ${what}.`,
        link: '/defects',
        entityType: 'Defect',
        entityId: after.id,
      });
    }
    if (after.assignedTo && after.assignedTo !== before?.assignedTo) {
      const assigneeId = await findAssignee(
        prisma,
        after.assignedTo,
        organizationId,
      );
      if (assigneeId) {
        await notify(prisma, {
          event: 'ASSIGNMENT',
          recipients: { kind: 'users', userIds: [assigneeId] },
          organizationId,
          actorUserId: actor.id,
          title: 'Defect assigned to you',
          message: `Defect "${after.title}" (${after.severity.toLowerCase()}) is assigned to you.`,
          link: '/defects',
          entityType: 'Defect',
          entityId: after.id,
        });
      }
    }
  } catch {
    // Notifications are best effort: never fail the saved change.
  }
}

// UAT cycles and releases wait for sign-off once they reach COMPLETED.
export async function notifyAwaitingSignOff(
  prisma: PrismaService,
  actor: Actor,
  kind: 'UAT' | 'RELEASE',
  before: { status: string } | null,
  after: {
    id: string;
    name: string;
    status: string;
    organizationId: string | null;
  },
) {
  try {
    if (after.status !== 'COMPLETED' || before?.status === 'COMPLETED') return;
    const isUat = kind === 'UAT';
    await notify(prisma, {
      event: 'APPROVAL_REMINDER',
      recipients: {
        kind: 'approval',
        approval: isUat ? 'UAT_SIGN_OFF' : 'RELEASE_SIGN_OFF',
      },
      organizationId: after.organizationId,
      actorUserId: actor.id,
      title: isUat
        ? 'UAT cycle waiting for sign-off'
        : 'Release waiting for sign-off',
      message: `${isUat ? 'UAT cycle' : 'Release'} "${after.name}" is completed and waiting for sign-off.`,
      link: isUat ? '/uat' : '/release-quality',
      entityType: isUat ? 'UatCycle' : 'Release',
      entityId: after.id,
    });
  } catch {
    // Notifications are best effort: never fail the saved change.
  }
}

// "Notify on test execution failure": a result recorded as FAIL.
export async function notifyExecutionFailure(
  prisma: PrismaService,
  actor: Actor,
  before: { status: string } | null,
  after: {
    id: string;
    status: string;
    testCase: {
      title: string;
      testScenario: { product: { organizationId: string | null } };
    };
    environment: { name: string };
  },
) {
  try {
    if (after.status !== 'FAIL' || before?.status === 'FAIL') return;
    if (!(await appFlags(prisma)).executionFailure) return;
    await notify(prisma, {
      event: 'DEFECT',
      recipients: { kind: 'permission', permission: 'defects:manage' },
      organizationId: after.testCase.testScenario.product.organizationId,
      actorUserId: actor.id,
      title: 'Test execution failed',
      message: `"${after.testCase.title}" failed on ${after.environment.name}.`,
      link: '/test-execution',
      entityType: 'TestExecution',
      entityId: after.id,
    });
  } catch {
    // Notifications are best effort: never fail the saved change.
  }
}

// "Notify when release readiness changes": the product's readiness verdict
// (READY / CONDITIONAL / NOT_READY) is remembered; whenever it is
// recomputed and differs from the remembered value, managers are told.
const READINESS_LABEL: Record<string, string> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditionally ready',
  NOT_READY: 'Not ready',
};

export async function trackReadiness(
  prisma: PrismaService,
  productId: string,
  readiness: string,
) {
  try {
    const key = `readiness.product.${productId}`;
    const row = await prisma.platformConfiguration.findUnique({
      where: { key },
    });
    const previous = (row?.value as { readiness?: string } | null)?.readiness;
    if (previous === readiness) return;
    await prisma.platformConfiguration.upsert({
      where: { key },
      create: { key, value: { readiness } },
      update: { value: { readiness } },
    });
    // The first observation only records a baseline.
    if (!previous || !(await appFlags(prisma)).readinessChange) return;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, organizationId: true },
    });
    if (!product) return;
    await notify(prisma, {
      event: 'RELEASE_READINESS',
      recipients: { kind: 'permission', permission: 'release_quality:manage' },
      organizationId: product.organizationId,
      title: 'Release readiness changed',
      message: `${product.name}: ${READINESS_LABEL[previous] ?? previous} → ${READINESS_LABEL[readiness] ?? readiness}.`,
      link: '/release-quality',
      entityType: 'Product',
      entityId: productId,
    });
  } catch {
    // Best effort: never affects the quality computation.
  }
}
