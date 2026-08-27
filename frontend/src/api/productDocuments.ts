import { apiDownload, apiFetch, apiUpload } from './client';
import type {
  ApiProductDocument,
  ApiProductDocumentVersionEntry,
  ReplaceProductDocumentPayload,
  UpdateProductDocumentPayload,
  UploadProductDocumentPayload,
} from '../types/productDocument';

export function fetchProductDocuments(productId: string): Promise<ApiProductDocument[]> {
  return apiFetch<ApiProductDocument[]>(`/product-documents?productId=${productId}`);
}

export function fetchProductDocumentVersions(
  documentId: string,
): Promise<ApiProductDocumentVersionEntry[]> {
  return apiFetch<ApiProductDocumentVersionEntry[]>(`/product-documents/${documentId}/versions`);
}

export function uploadProductDocument(
  payload: UploadProductDocumentPayload,
): Promise<ApiProductDocument> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('productId', payload.productId);
  formData.append('documentType', payload.documentType);
  if (payload.description) formData.append('description', payload.description);
  if (payload.relatedVersion) formData.append('relatedVersion', payload.relatedVersion);
  if (payload.status) formData.append('status', payload.status);

  return apiUpload<ApiProductDocument>('/product-documents', formData);
}

export function replaceProductDocumentFile(
  documentId: string,
  payload: ReplaceProductDocumentPayload,
): Promise<ApiProductDocument> {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.description !== undefined) formData.append('description', payload.description);
  if (payload.relatedVersion !== undefined) formData.append('relatedVersion', payload.relatedVersion);
  if (payload.status) formData.append('status', payload.status);

  return apiUpload<ApiProductDocument>(`/product-documents/${documentId}/replace`, formData);
}

export function updateProductDocument(
  documentId: string,
  payload: UpdateProductDocumentPayload,
): Promise<ApiProductDocument> {
  return apiFetch<ApiProductDocument>(`/product-documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProductDocument(documentId: string): Promise<void> {
  return apiFetch<void>(`/product-documents/${documentId}`, { method: 'DELETE' });
}

export function downloadProductDocument(documentId: string): Promise<Blob> {
  return apiDownload(`/product-documents/${documentId}/content?download=1`);
}

export function downloadProductDocumentVersion(
  documentId: string,
  versionEntryId: string,
): Promise<Blob> {
  return apiDownload(
    `/product-documents/${documentId}/versions/${versionEntryId}/content?download=1`,
  );
}
