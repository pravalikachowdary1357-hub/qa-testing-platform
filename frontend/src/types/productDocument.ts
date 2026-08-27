export type ApiProductDocumentType =
  | 'PRODUCT_REQUIREMENTS_BRD'
  | 'FUNCTIONAL_SPEC_FRD'
  | 'TECHNICAL_SPEC'
  | 'USER_MANUAL'
  | 'ARCHITECTURE_DESIGN'
  | 'API_DOCUMENTATION'
  | 'RELEASE_NOTES'
  | 'INSTALLATION_DEPLOYMENT_GUIDE'
  | 'CONFIGURATION_DOCUMENTS'
  | 'COMPLIANCE_REGULATORY'
  | 'REFERENCE_DOCUMENTS'
  | 'OTHER_SUPPORTING_FILES';

export type ApiProductDocumentStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';

export interface ApiProductDocument {
  id: string;
  productId: string;
  documentType: ApiProductDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  version: number;
  description: string | null;
  status: ApiProductDocumentStatus;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProductDocumentVersionEntry {
  id: string;
  isCurrent: boolean;
  version: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  status: ApiProductDocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
}

export interface UploadProductDocumentPayload {
  productId: string;
  documentType: ApiProductDocumentType;
  description?: string;
  status?: ApiProductDocumentStatus;
  file: File;
}

export interface ReplaceProductDocumentPayload {
  description?: string;
  status?: ApiProductDocumentStatus;
  file: File;
}

export interface UpdateProductDocumentPayload {
  documentType?: ApiProductDocumentType;
  description?: string;
  status?: ApiProductDocumentStatus;
}
