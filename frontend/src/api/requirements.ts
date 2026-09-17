import { apiDownload, apiFetch, apiUpload } from './client';
import type {
  ApiRequirement,
  ApiRequirementAttachment,
  ApiRequirementVersion,
  CreateRequirementPayload,
  ReviewDecision,
  UpdateRequirementPayload,
} from '../types/requirement';
import type { ApiAuditLogEntry } from '../types/settings';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';

export function fetchRequirements(productId?: string): Promise<ApiRequirement[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<ApiRequirement[]>(`/requirements${qs}`);
}

export function fetchRequirement(id: string): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>(`/requirements/${id}`);
}

export function createRequirement(
  data: CreateRequirementPayload,
): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>('/requirements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRequirement(
  id: string,
  data: UpdateRequirementPayload,
): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>(`/requirements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteRequirement(id: string): Promise<void> {
  return apiFetch<void>(`/requirements/${id}`, { method: 'DELETE' });
}

export function importRequirements(
  productId: string,
  file: File,
): Promise<ImportResultSummary> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ImportResultSummary>(
    `/requirements/import?productId=${productId}`,
    formData,
  );
}

export function reviewRequirement(
  id: string,
  decision: ReviewDecision,
  comment?: string,
): Promise<ApiRequirement> {
  return apiFetch<ApiRequirement>(`/requirements/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, comment }),
  });
}

export function fetchRequirementActivity(id: string): Promise<ApiAuditLogEntry[]> {
  return apiFetch<ApiAuditLogEntry[]>(`/requirements/${id}/activity`);
}

export function fetchRequirementVersions(id: string): Promise<ApiRequirementVersion[]> {
  return apiFetch<ApiRequirementVersion[]>(`/requirements/${id}/versions`);
}

export function fetchRequirementAttachments(id: string): Promise<ApiRequirementAttachment[]> {
  return apiFetch<ApiRequirementAttachment[]>(`/requirements/${id}/attachments`);
}

export function uploadRequirementAttachment(
  id: string,
  file: File,
): Promise<ApiRequirementAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<ApiRequirementAttachment>(`/requirements/${id}/attachments`, formData);
}

export function downloadRequirementAttachment(
  id: string,
  attachmentId: string,
): Promise<Blob> {
  return apiDownload(`/requirements/${id}/attachments/${attachmentId}/content?download=1`);
}

export function deleteRequirementAttachment(id: string, attachmentId: string): Promise<void> {
  return apiFetch<void>(`/requirements/${id}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}
