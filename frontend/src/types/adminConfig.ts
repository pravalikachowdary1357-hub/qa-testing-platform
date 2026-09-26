export interface WorkflowTransition {
  from: string;
  to: string;
}

export interface ApiWorkflow {
  key: 'TEST_CASE' | 'DEFECT';
  label: string;
  statuses: string[];
  enforced: boolean;
  transitions: WorkflowTransition[];
}

export interface ApiApprovalPolicy {
  key: 'REQUIREMENT_REVIEW' | 'UAT_SIGN_OFF' | 'RELEASE_SIGN_OFF';
  label: string;
  rejectCommentLocked: boolean;
  requireCommentOnApprove: boolean;
  requireCommentOnReject: boolean;
}

export type DashboardSectionKey = 'KPI_CARDS' | 'PRODUCT_OVERVIEW' | 'DISTRIBUTIONS' | 'TRENDS';

export interface ApiDashboardConfig {
  hiddenSections: DashboardSectionKey[];
  sections: { key: DashboardSectionKey; label: string }[];
}

export interface ApiIntegration {
  key: string;
  name: string;
  description: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'DISABLED';
  details: Record<string, unknown>;
  configuredVia: string;
}

export interface ApiDataRetention {
  auditLogRetentionDays: number | null;
  aiHistoryRetentionDays: number | null;
  expiredSessionRetentionDays: number | null;
  automaticDeletionEnabled: boolean;
  recordsPastRetention: { auditLog: number; aiHistory: number; expiredSessions: number };
}

export type UpdateDataRetentionPayload = Pick<
  ApiDataRetention,
  'auditLogRetentionDays' | 'aiHistoryRetentionDays' | 'expiredSessionRetentionDays'
>;

export interface TemplateStep {
  action: string;
  expectedResult: string;
}

export interface ApiTestTemplate {
  id: string;
  name: string;
  description: string | null;
  preconditions: string | null;
  expectedResult: string | null;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  steps: TemplateStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestTemplatePayload {
  name: string;
  description?: string;
  preconditions?: string;
  expectedResult?: string;
  priority?: ApiTestTemplate['priority'];
  steps: TemplateStep[];
  isActive?: boolean;
}
