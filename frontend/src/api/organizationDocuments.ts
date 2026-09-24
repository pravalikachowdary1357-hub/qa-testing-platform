import { apiDownload, apiFetch, apiUpload } from './client';
import type { ApiOrganizationDocument } from '../types/organization';

export function fetchOrganizationDocuments(organizationId: string): Promise<ApiOrganizationDocument[]> {
  return apiFetch<ApiOrganizationDocument[]>(`/organization-documents?organizationId=${organizationId}`);
}

export function uploadOrganizationDocument(
  organizationId: string,
  file: File,
): Promise<ApiOrganizationDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('organizationId', organizationId);
  return apiUpload<ApiOrganizationDocument>('/organization-documents', formData);
}

export function downloadOrganizationDocument(documentId: string): Promise<Blob> {
  return apiDownload(`/organization-documents/${documentId}/content?download=1`);
}

export function deleteOrganizationDocument(documentId: string): Promise<void> {
  return apiFetch<void>(`/organization-documents/${documentId}`, { method: 'DELETE' });
}
