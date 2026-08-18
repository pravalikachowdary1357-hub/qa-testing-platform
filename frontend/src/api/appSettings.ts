import { apiFetch } from './client';
import type { ApiAppSettings, UpdateAppSettingsPayload } from '../types/settings';

export function fetchAppSettings(): Promise<ApiAppSettings> {
  return apiFetch<ApiAppSettings>('/app-settings');
}

export function updateAppSettings(data: UpdateAppSettingsPayload): Promise<ApiAppSettings> {
  return apiFetch<ApiAppSettings>('/app-settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
