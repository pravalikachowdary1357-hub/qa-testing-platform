import {
  DefectStatus,
  ReleaseStatus,
  RequirementStatus,
  TestCaseStatus,
  TestExecutionStatus,
  TestPlanStatus,
  TestScenarioStatus,
  UatCycleStatus,
} from '../../generated/prisma/enums.js';

// Workflows whose status transitions the Administrator can configure. The
// statuses are the existing Prisma enums -- configuration can only restrict
// transitions between them, never invent new statuses.
// Covers every workflow listed in Requirements section 23 (Workflow &
// Approval Management) that has a status lifecycle in TestSphere.
export const WORKFLOW_STATUSES = {
  REQUIREMENT: Object.values(RequirementStatus) as string[],
  TEST_PLAN: Object.values(TestPlanStatus) as string[],
  TEST_SCENARIO: Object.values(TestScenarioStatus) as string[],
  TEST_CASE: Object.values(TestCaseStatus) as string[],
  TEST_EXECUTION: Object.values(TestExecutionStatus) as string[],
  DEFECT: Object.values(DefectStatus) as string[],
  UAT_CYCLE: Object.values(UatCycleStatus) as string[],
  RELEASE: Object.values(ReleaseStatus) as string[],
} as const;

export type WorkflowKey = keyof typeof WORKFLOW_STATUSES;
export const WORKFLOW_KEYS = Object.keys(WORKFLOW_STATUSES) as WorkflowKey[];

export const WORKFLOW_LABELS: Record<WorkflowKey, string> = {
  REQUIREMENT: 'Requirement workflow (incl. approval)',
  TEST_PLAN: 'Test plan workflow (incl. approval)',
  TEST_SCENARIO: 'Test scenario workflow',
  TEST_CASE: 'Test case review & approval workflow',
  TEST_EXECUTION: 'Test execution result rules',
  DEFECT: 'Defect workflow (incl. approval & closure)',
  UAT_CYCLE: 'UAT workflow (incl. approval)',
  RELEASE: 'Release approval workflow',
};

// The approval points that already exist in TestSphere.
export const APPROVAL_KEYS = [
  'REQUIREMENT_REVIEW',
  'UAT_SIGN_OFF',
  'RELEASE_SIGN_OFF',
] as const;
export type ApprovalKey = (typeof APPROVAL_KEYS)[number];

export const APPROVAL_LABELS: Record<ApprovalKey, string> = {
  REQUIREMENT_REVIEW: 'Requirement review',
  UAT_SIGN_OFF: 'UAT cycle sign-off',
  RELEASE_SIGN_OFF: 'Release sign-off',
};

// Requirement review has always required a comment to reject/return for
// rework (enforced by its DTO), so that floor can never be switched off.
export const APPROVAL_LOCKED_REJECT_COMMENT: Record<ApprovalKey, boolean> = {
  REQUIREMENT_REVIEW: true,
  UAT_SIGN_OFF: false,
  RELEASE_SIGN_OFF: false,
};

// Dashboard sections of the product testing dashboard that can be hidden.
export const DASHBOARD_SECTIONS = [
  'KPI_CARDS',
  'PRODUCT_OVERVIEW',
  'DISTRIBUTIONS',
  'TRENDS',
] as const;
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSection, string> = {
  KPI_CARDS: 'KPI summary cards',
  PRODUCT_OVERVIEW: 'Product overview table',
  DISTRIBUTIONS: 'Defects by severity / Requirements by risk',
  TRENDS: '8-week trends',
};

export const CONFIG_KEYS = {
  workflow: (key: WorkflowKey) => `workflow.${key}`,
  approval: (key: ApprovalKey) => `approval.${key}`,
  dashboard: 'dashboard.layout',
  notifications: 'notifications',
  retention: 'data_retention',
} as const;

export interface WorkflowConfig {
  enforced: boolean;
  transitions: { from: string; to: string }[];
}

export interface ApprovalPolicy {
  requireCommentOnApprove: boolean;
  requireCommentOnReject: boolean;
  // Roles allowed to make this decision. Empty = every role that holds the
  // approval permission (the behaviour before this setting existed).
  approverRoleIds: string[];
}

// The permission that already gates each approval endpoint. An approver
// role must hold it, otherwise selecting it would have no effect.
export const APPROVAL_PERMISSION: Record<ApprovalKey, string> = {
  REQUIREMENT_REVIEW: 'requirements:approve',
  UAT_SIGN_OFF: 'uat:approve',
  RELEASE_SIGN_OFF: 'release_quality:approve',
};

export interface DashboardConfig {
  hiddenSections: DashboardSection[];
  // Optional per-role override (role id -> hidden sections). A role with an
  // override uses it instead of the global hiddenSections.
  roleOverrides: Record<string, DashboardSection[]>;
}

// Notification configuration (Requirements section 24). Delivery channels
// and event categories exactly as listed in the source. Delivery is real:
// IN_APP writes to the notifications table (header bell), EMAIL goes out
// over SMTP when SMTP_* variables are set, TEAMS_SLACK posts to the
// webhooks configured under Settings > Integrations.
export const NOTIFICATION_CHANNELS = [
  'EMAIL',
  'IN_APP',
  'TEAMS_SLACK',
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> =
  {
    EMAIL: 'Email',
    IN_APP: 'In-app',
    TEAMS_SLACK: 'Teams / Slack',
  };
export const NOTIFICATION_EVENTS = [
  'ASSIGNMENT',
  'DEFECT',
  'TEST_CYCLE_REMINDER',
  'APPROVAL_REMINDER',
  'ESCALATION',
  'OVERDUE_ALERT',
  // Driven by the existing "Notify when release readiness changes" setting.
  'RELEASE_READINESS',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  ASSIGNMENT: 'Assignment notifications',
  DEFECT: 'Defect notifications',
  TEST_CYCLE_REMINDER: 'Test cycle reminders',
  APPROVAL_REMINDER: 'Approval reminders',
  ESCALATION: 'Escalations',
  OVERDUE_ALERT: 'Overdue alerts',
  RELEASE_READINESS: 'Release readiness changes',
};
export interface NotificationConfig {
  // event -> channels it is delivered to
  routing: Record<NotificationEvent, NotificationChannel[]>;
  // event -> roles that receive it. Empty = the default recipients for that
  // event (see NOTIFICATION_DEFAULT_RECIPIENTS). Assignment notifications
  // always go to the assigned person only.
  recipientRoleIds: Partial<Record<NotificationEvent, string[]>>;
  escalationAfterDays: number | null;
  reminderDaysBeforeDue: number | null;
}
export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  // In-app is on by default for every event; email and Teams/Slack are
  // opt-in because they need outside configuration.
  routing: {
    ASSIGNMENT: ['IN_APP'],
    DEFECT: ['IN_APP'],
    TEST_CYCLE_REMINDER: ['IN_APP'],
    APPROVAL_REMINDER: ['IN_APP'],
    ESCALATION: ['IN_APP'],
    OVERDUE_ALERT: ['IN_APP'],
    RELEASE_READINESS: ['IN_APP'],
  },
  recipientRoleIds: {},
  escalationAfterDays: 3,
  reminderDaysBeforeDue: 2,
};

// Who receives each event when no roles are configured, described in terms
// of the permission a role must hold.
export const NOTIFICATION_DEFAULT_RECIPIENTS: Record<
  NotificationEvent,
  string
> = {
  ASSIGNMENT: 'The assigned person',
  DEFECT:
    'Roles with defects:manage (new defects, defects raised to critical/major, reopened defects, failed test executions)',
  TEST_CYCLE_REMINDER:
    'Roles with test_plans:manage (test plans) or release_quality:manage (releases)',
  APPROVAL_REMINDER:
    'The configured approver roles, or roles holding the approval permission',
  ESCALATION: 'Roles with release_quality:approve',
  OVERDUE_ALERT:
    'Roles with test_plans:manage (test plans) or release_quality:manage (releases)',
  RELEASE_READINESS: 'Roles with release_quality:manage',
};

export interface DataRetentionConfig {
  auditLogRetentionDays: number | null;
  aiHistoryRetentionDays: number | null;
  expiredSessionRetentionDays: number | null;
  // Requirements section 25: documents & evidence retention.
  documentRetentionDays: number | null;
}

// Defaults reproduce pre-configuration behaviour exactly: every transition
// allowed and not enforced; comment rules as the DTOs already applied;
// every dashboard section visible; keep everything forever.
export function defaultWorkflow(key: WorkflowKey): WorkflowConfig {
  const statuses = WORKFLOW_STATUSES[key];
  return {
    enforced: false,
    transitions: statuses.flatMap((from) =>
      statuses.filter((to) => to !== from).map((to) => ({ from, to })),
    ),
  };
}

export function defaultApproval(key: ApprovalKey): ApprovalPolicy {
  return {
    requireCommentOnApprove: false,
    requireCommentOnReject: APPROVAL_LOCKED_REJECT_COMMENT[key],
    approverRoleIds: [],
  };
}

export const DEFAULT_DASHBOARD: DashboardConfig = {
  hiddenSections: [],
  roleOverrides: {},
};

export const DEFAULT_RETENTION: DataRetentionConfig = {
  auditLogRetentionDays: null,
  aiHistoryRetentionDays: null,
  expiredSessionRetentionDays: null,
  documentRetentionDays: null,
};

// The audit trail is a compliance record, so its retention window has a
// floor -- it can never be configured shorter than a year.
export const MIN_AUDIT_RETENTION_DAYS = 365;
export const MIN_OTHER_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 3650;
