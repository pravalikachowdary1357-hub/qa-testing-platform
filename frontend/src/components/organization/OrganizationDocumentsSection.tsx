import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { ApiError } from '../../api/client';
import {
  deleteOrganizationDocument,
  downloadOrganizationDocument,
  fetchOrganizationDocuments,
  uploadOrganizationDocument,
} from '../../api/organizationDocuments';
import { formatFileSize } from '../productdocument/productDocumentLabels';
import type { ApiOrganizationDocument } from '../../types/organization';

interface OrganizationDocumentsSectionProps {
  organizationId: string;
}

export function OrganizationDocumentsSection({ organizationId }: OrganizationDocumentsSectionProps) {
  const [documents, setDocuments] = useState<ApiOrganizationDocument[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = () => {
    fetchOrganizationDocuments(organizationId)
      .then(setDocuments)
      .catch(() => setDocuments([]));
  };

  useEffect(() => {
    setDocuments(null);
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadOrganizationDocument(organizationId, file);
      loadDocuments();
      setSnackbar({ message: 'Document uploaded.', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? err.message : 'Failed to upload document.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: ApiOrganizationDocument) => {
    setBusyDocumentId(doc.id);
    try {
      const blob = await downloadOrganizationDocument(doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Failed to open file (HTTP ${err.status}).` : 'Failed to open file.',
        severity: 'error',
      });
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleDelete = async (doc: ApiOrganizationDocument) => {
    setBusyDocumentId(doc.id);
    try {
      await deleteOrganizationDocument(doc.id);
      loadDocuments();
      setSnackbar({ message: 'Document removed.', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? err.message : 'Failed to remove document.',
        severity: 'error',
      });
      setBusyDocumentId(null);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Organization Documents
      </Typography>

      {documents === null && (
        <Box sx={{ display: 'flex', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {documents && documents.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          No documents uploaded yet.
        </Typography>
      )}

      {documents && documents.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          {documents.map((doc) => (
            <Chip
              key={doc.id}
              label={`${doc.fileName} (${formatFileSize(doc.fileSize)})`}
              onClick={() => handleDownload(doc)}
              onDelete={() => handleDelete(doc)}
              disabled={busyDocumentId === doc.id}
              variant="outlined"
            />
          ))}
        </Stack>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          void handleFileSelected(file);
        }}
      />
      <Button
        size="small"
        variant="outlined"
        startIcon={uploading ? <CircularProgress size={14} /> : <UploadFileIcon />}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        Upload Document
      </Button>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
