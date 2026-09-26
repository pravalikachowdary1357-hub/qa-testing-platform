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
}

export interface DashboardConfig {
  hiddenSections: DashboardSection[];
  // Optional per-role override (role id -> hidden sections). A role with an
  // override uses it instead of the global hiddenSections.
  roleOverrides: Record<string, DashboardSection[]>;
}

// Notification configuration (Requirements section 24). Delivery channels
// and event categories exactly as listed in the source. This is
// configuration only: TestSphere has no delivery infrastructure yet, so
// saving it never sends anything.
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
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  ASSIGNMENT: 'Assignment notifications',
  DEFECT: 'Defect notifications',
  TEST_CYCLE_REMINDER: 'Test cycle reminders',
  APPROVAL_REMINDER: 'Approval reminders',
  ESCALATION: 'Escalations',
  OVERDUE_ALERT: 'Overdue alerts',
};
export interface NotificationConfig {
  // event -> channels it should go to once delivery exists
  routing: Record<NotificationEvent, NotificationChannel[]>;
  escalationAfterDays: number | null;
  reminderDaysBeforeDue: number | null;
}
export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  routing: {
    ASSIGNMENT: [],
    DEFECT: [],
    TEST_CYCLE_REMINDER: [],
    APPROVAL_REMINDER: [],
    ESCALATION: [],
    OVERDUE_ALERT: [],
  },
  escalationAfterDays: null,
  reminderDaysBeforeDue: null,
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
