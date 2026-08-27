import { apiFetch, apiUpload } from './client';
import type { ApiAppSettings, UpdateAppSettingsPayload } from '../types/settings';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchAppSettings(): Promise<ApiAppSettings> {
  return apiFetch<ApiAppSettings>('/app-settings');
}

export function updateAppSettings(data: UpdateAppSettingsPayload): Promise<ApiAppSettings> {
  return apiFetch<ApiAppSettings>('/app-settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function importAppSettings(file: File): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>('/app-settings/import', formData);
}
