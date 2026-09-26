import { DefectStatus, TestCaseStatus } from '../../generated/prisma/enums.js';

// Workflows whose status transitions the Administrator can configure. The
// statuses are the existing Prisma enums -- configuration can only restrict
// transitions between them, never invent new statuses.
export const WORKFLOW_STATUSES = {
  TEST_CASE: Object.values(TestCaseStatus) as string[],
  DEFECT: Object.values(DefectStatus) as string[],
} as const;

export type WorkflowKey = keyof typeof WORKFLOW_STATUSES;
export const WORKFLOW_KEYS = Object.keys(WORKFLOW_STATUSES) as WorkflowKey[];

export const WORKFLOW_LABELS: Record<WorkflowKey, string> = {
  TEST_CASE: 'Test case workflow',
  DEFECT: 'Defect workflow',
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
}

export interface DataRetentionConfig {
  auditLogRetentionDays: number | null;
  aiHistoryRetentionDays: number | null;
  expiredSessionRetentionDays: number | null;
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

export const DEFAULT_DASHBOARD: DashboardConfig = { hiddenSections: [] };

export const DEFAULT_RETENTION: DataRetentionConfig = {
  auditLogRetentionDays: null,
  aiHistoryRetentionDays: null,
  expiredSessionRetentionDays: null,
};

// The audit trail is a compliance record, so its retention window has a
// floor -- it can never be configured shorter than a year.
export const MIN_AUDIT_RETENTION_DAYS = 365;
export const MIN_OTHER_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 3650;
