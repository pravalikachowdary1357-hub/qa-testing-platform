export interface WorkflowTransition {
  from: string;
  to: string;
}

export interface ApiWorkflow {
  key: string;
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
  // Empty = any role holding `permission`.
  approverRoleIds: string[];
  permission: string;
}

export type DashboardSectionKey = 'KPI_CARDS' | 'PRODUCT_OVERVIEW' | 'DISTRIBUTIONS' | 'TRENDS';

export interface ApiDashboardConfig {
  // Effective layout for the signed-in user's role.
  hiddenSections: DashboardSectionKey[];
  // Present only for users who can manage the dashboard.
  globalHiddenSections?: DashboardSectionKey[];
  roleOverrides?: Record<string, DashboardSectionKey[]>;
  sections: { key: DashboardSectionKey; label: string }[];
}

export interface ApiIntegration {
  key: string;
  category: string;
  name: string;
  level: 'IMPLEMENTED' | 'FOUNDATION' | 'FUTURE';
  description: string;
  // CONNECTED only after a real, successful delivery / live configuration;
  // CONFIGURED = set up but not yet proven; ERROR = the last delivery failed.
  status:
    | 'CONNECTED'
    | 'CONFIGURED'
    | 'ERROR'
    | 'NOT_CONFIGURED'
    | 'DISABLED'
    | 'REFERENCE_ONLY'
    | 'NOT_AVAILABLE';
  details?: Record<string, unknown>;
  configuredVia?: string;
}

export interface ApiNotificationConfig {
  routing: Record<string, string[]>;
  recipientRoleIds: Record<string, string[]>;
  escalationAfterDays: number | null;
  reminderDaysBeforeDue: number | null;
  deliveryImplemented: boolean;
  dailyScheduleEnabled: boolean;
  channels: { key: string; label: string; available: boolean; detail: string }[];
  events: { key: string; label: string; defaultRecipients: string }[];
}

export type WebhookProvider = 'TEAMS' | 'SLACK';

export interface ApiWebhook {
  id: string;
  provider: WebhookProvider;
  name: string;
  // Host plus the last characters of the path; the full URL is never sent back.
  urlHint: string;
  events: string[];
  enabled: boolean;
  lastStatus: 'OK' | 'FAILED' | null;
  lastError: string | null;
  lastDeliveredAt: string | null;
}

export interface ApiEmailStatus {
  configured: boolean;
  host: string | null;
  from: string | null;
  last: { lastStatus: 'OK' | 'FAILED'; lastError: string | null; lastDeliveredAt: string } | null;
  requiredVariables: string[];
}

export interface ApiNotification {
  id: string;
  event: string;
  title: string;
  message: string;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ApiDataRetention {
  auditLogRetentionDays: number | null;
  aiHistoryRetentionDays: number | null;
  expiredSessionRetentionDays: number | null;
  documentRetentionDays: number | null;
  automaticDeletionEnabled: boolean;
  recordsPastRetention: { auditLog: number; aiHistory: number; expiredSessions: number; documents: number };
}

export type UpdateDataRetentionPayload = Pick<
  ApiDataRetention,
  'auditLogRetentionDays' | 'aiHistoryRetentionDays' | 'expiredSessionRetentionDays' | 'documentRetentionDays'
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
