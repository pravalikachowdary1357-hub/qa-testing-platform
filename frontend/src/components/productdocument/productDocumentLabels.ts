import type { ApiProductDocumentStatus, ApiProductDocumentType } from '../../types/productDocument';

export const DOCUMENT_TYPE_LABELS: Record<ApiProductDocumentType, string> = {
  PRODUCT_REQUIREMENTS_BRD: 'Product Requirements / BRD',
  FUNCTIONAL_SPEC_FRD: 'Functional Specification / FRD',
  TECHNICAL_SPEC: 'Technical Specification',
  USER_MANUAL: 'User Manual',
  ARCHITECTURE_DESIGN: 'Architecture / Design Documents',
  API_DOCUMENTATION: 'API Documentation',
  RELEASE_NOTES: 'Release Notes',
  INSTALLATION_DEPLOYMENT_GUIDE: 'Installation / Deployment Guide',
  CONFIGURATION_DOCUMENTS: 'Configuration Documents',
  COMPLIANCE_REGULATORY: 'Compliance / Regulatory Documents',
  REFERENCE_DOCUMENTS: 'Reference Documents',
  OTHER_SUPPORTING_FILES: 'Other Supporting Files',
};

export const DOCUMENT_STATUS_LABELS: Record<ApiProductDocumentStatus, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
};

export const MAX_DOCUMENT_FILE_SIZE_MB = 4;
export const MAX_DOCUMENT_FILE_SIZE_BYTES = MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
