import { apiFetch } from './client';
import type {
  ApiApprovalPolicy,
  ApiDashboardConfig,
  ApiDataRetention,
  ApiIntegration,
  ApiNotificationConfig,
  ApiTestTemplate,
  ApiWorkflow,
  DashboardSectionKey,
  TestTemplatePayload,
  UpdateDataRetentionPayload,
  WorkflowTransition,
} from '../types/adminConfig';

const put = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const fetchWorkflows = () => apiFetch<ApiWorkflow[]>('/workflows');
export const updateWorkflow = (key: string, enforced: boolean, transitions: WorkflowTransition[]) =>
  put<ApiWorkflow>(`/workflows/${key}`, { enforced, transitions });

export const fetchApprovalPolicies = () => apiFetch<ApiApprovalPolicy[]>('/approval-policies');
export const updateApprovalPolicy = (
  key: string,
  data: Pick<ApiApprovalPolicy, 'requireCommentOnApprove' | 'requireCommentOnReject' | 'approverRoleIds'>,
) => put<ApiApprovalPolicy>(`/approval-policies/${key}`, data);

export const fetchDashboardConfig = () => apiFetch<ApiDashboardConfig>('/dashboard-config');
export const updateDashboardConfig = (hiddenSections: DashboardSectionKey[], roleId?: string) =>
  put<ApiDashboardConfig>('/dashboard-config', { hiddenSections, ...(roleId ? { roleId } : {}) });
export const clearDashboardRoleOverride = (roleId: string) =>
  apiFetch<ApiDashboardConfig>(`/dashboard-config/roles/${roleId}`, { method: 'DELETE' });

export const fetchNotificationConfig = () => apiFetch<ApiNotificationConfig>('/notification-config');
export const updateNotificationConfig = (
  data: Pick<ApiNotificationConfig, 'routing' | 'recipientRoleIds' | 'escalationAfterDays' | 'reminderDaysBeforeDue'>,
) => put<ApiNotificationConfig>('/notification-config', data);

export const fetchIntegrations = () => apiFetch<ApiIntegration[]>('/integrations');

export const fetchDataRetention = () => apiFetch<ApiDataRetention>('/data-retention');
export const updateDataRetention = (data: UpdateDataRetentionPayload) =>
  put<ApiDataRetention>('/data-retention', data);

export const fetchTestTemplates = () => apiFetch<ApiTestTemplate[]>('/test-templates');
export const createTestTemplate = (data: TestTemplatePayload) =>
  apiFetch<ApiTestTemplate>('/test-templates', { method: 'POST', body: JSON.stringify(data) });
export const updateTestTemplate = (id: string, data: Partial<TestTemplatePayload>) =>
  apiFetch<ApiTestTemplate>(`/test-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteTestTemplate = (id: string) =>
  apiFetch<void>(`/test-templates/${id}`, { method: 'DELETE' });
