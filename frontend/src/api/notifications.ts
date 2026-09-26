import { apiFetch } from './client';
import type { ApiEmailStatus, ApiNotification, ApiWebhook, WebhookProvider } from '../types/adminConfig';

const send = <T>(path: string, method: string, body?: unknown) =>
  apiFetch<T>(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

// ---- The signed-in user's notifications (header bell) ----
export const fetchNotifications = (unreadOnly = false, limit = 20) =>
  apiFetch<ApiNotification[]>(`/notifications?limit=${limit}${unreadOnly ? '&unreadOnly=true' : ''}`);
export const fetchUnreadCount = () => apiFetch<{ count: number }>('/notifications/unread-count');
export const markNotificationRead = (id: string) => send<{ ok: boolean }>(`/notifications/${id}/read`, 'PATCH');
export const markAllNotificationsRead = () => send<{ updated: number }>('/notifications/read-all', 'POST');
export const runScheduledNotifications = () =>
  send<{ approvalReminders: number; escalations: number; dueSoon: number; overdue: number }>(
    '/notifications/run-scheduled',
    'POST',
  );

// ---- Settings > Integrations ----
export const fetchWebhooks = () => apiFetch<ApiWebhook[]>('/integrations/webhooks');
export const createWebhook = (data: {
  provider: WebhookProvider;
  name: string;
  url: string;
  events: string[];
  enabled?: boolean;
}) => send<ApiWebhook>('/integrations/webhooks', 'POST', data);
export const updateWebhook = (
  id: string,
  data: Partial<{ name: string; url: string; events: string[]; enabled: boolean }>,
) => send<ApiWebhook>(`/integrations/webhooks/${id}`, 'PATCH', data);
export const deleteWebhook = (id: string) => send<void>(`/integrations/webhooks/${id}`, 'DELETE');
export const testWebhook = (id: string) =>
  send<{ delivered: boolean; error: string | null; webhook: ApiWebhook }>(`/integrations/webhooks/${id}/test`, 'POST');
export const fetchEmailStatus = () => apiFetch<ApiEmailStatus>('/integrations/email');
export const testEmail = () =>
  send<{ delivered: boolean; error: string | null; to: string }>('/integrations/email/test', 'POST');
