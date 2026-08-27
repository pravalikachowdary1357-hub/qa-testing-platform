import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { StatusChip } from '../common/StatusChip';
import { UploadProductDocumentDialog } from './UploadProductDocumentDialog';
import { ReplaceProductDocumentDialog } from './ReplaceProductDocumentDialog';
import { DeleteProductDocumentDialog } from './DeleteProductDocumentDialog';
import { ProductDocumentVersionHistoryDialog } from './ProductDocumentVersionHistoryDialog';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, formatFileSize } from './productDocumentLabels';
import {
  deleteProductDocument,
  downloadProductDocument,
  downloadProductDocumentVersion,
  fetchProductDocuments,
  replaceProductDocumentFile,
  uploadProductDocument,
} from '../../api/productDocuments';
import { ApiError } from '../../api/client';
import type {
  ApiProductDocument,
  ApiProductDocumentStatus,
  ApiProductDocumentType,
  ApiProductDocumentVersionEntry,
} from '../../types/productDocument';

function openBlob(blob: Blob, fileName: string, forceDownload: boolean) {
  const url = URL.createObjectURL(blob);
  if (forceDownload) {
    const link = window.document.createElement('a');
    link.href = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

interface ProductDocumentsTabProps {
  productId: string;
}

export function ProductDocumentsTab({ productId }: ProductDocumentsTabProps) {
  const [documents, setDocuments] = useState<ApiProductDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [replacingDocument, setReplacingDocument] = useState<ApiProductDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<ApiProductDocument | null>(null);
  const [historyDocument, setHistoryDocument] = useState<ApiProductDocument | null>(null);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadDocuments = () => {
    setError(null);
    return fetchProductDocuments(productId)
      .then((data) => setDocuments(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load documents (HTTP ${err.status}).`
            : 'Failed to load documents. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setDocuments(null);
    setError(null);

    fetchProductDocuments(productId)
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load documents (HTTP ${err.status}).`
            : 'Failed to load documents. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const isLoading = documents === null && !error;

  const handleUpload = async (values: {
    file: File;
    documentType: ApiProductDocumentType;
    description: string;
    status: ApiProductDocumentStatus;
  }) => {
    await uploadProductDocument({
      productId,
      documentType: values.documentType,
      description: values.description || undefined,
      status: values.status,
      file: values.file,
    });
    await loadDocuments();
    setSnackbar({ message: 'File uploaded.', severity: 'success' });
  };

  const handleReplace = async (values: { file: File; description: string; status: ApiProductDocument['status'] }) => {
    if (!replacingDocument) return;
    await replaceProductDocumentFile(replacingDocument.id, {
      file: values.file,
      description: values.description || undefined,
      status: values.status,
    });
    await loadDocuments();
    setSnackbar({ message: 'File replaced.', severity: 'success' });
  };

  const handleDelete = async () => {
    if (!deletingDocument) return;
    await deleteProductDocument(deletingDocument.id);
    await loadDocuments();
    setSnackbar({ message: 'File deleted.', severity: 'success' });
  };

  const handleView = async (doc: ApiProductDocument) => {
    setBusyDocumentId(doc.id);
    try {
      const blob = await downloadProductDocument(doc.id);
      openBlob(blob, doc.fileName, false);
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Failed to open file (HTTP ${err.status}).` : 'Failed to open file.',
        severity: 'error',
      });
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleDownload = async (doc: ApiProductDocument) => {
    setBusyDocumentId(doc.id);
    try {
      const blob = await downloadProductDocument(doc.id);
      openBlob(blob, doc.fileName, true);
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError ? `Failed to download file (HTTP ${err.status}).` : 'Failed to download file.',
        severity: 'error',
      });
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleDownloadVersion = async (entry: ApiProductDocumentVersionEntry) => {
    if (!historyDocument) return;
    try {
      const blob = entry.isCurrent
        ? await downloadProductDocument(historyDocument.id)
        : await downloadProductDocumentVersion(historyDocument.id, entry.id);
      openBlob(blob, entry.fileName, true);
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError ? `Failed to download version (HTTP ${err.status}).` : 'Failed to download version.',
        severity: 'error',
      });
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
          Upload File
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {documents && documents.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No documents uploaded yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
            Upload File
          </Button>
        </Paper>
      )}

      {documents && documents.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {doc.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(doc.fileSize)}
                      {doc.description ? ` · ${doc.description}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{DOCUMENT_TYPE_LABELS[doc.documentType]}</TableCell>
                  <TableCell>v{doc.version}</TableCell>
                  <TableCell>
                    <StatusChip status={DOCUMENT_STATUS_LABELS[doc.status]} />
                  </TableCell>
                  <TableCell>{doc.uploadedBy}</TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyDocumentId === doc.id}
                          onClick={() => handleView(doc)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Download">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyDocumentId === doc.id}
                          onClick={() => handleDownload(doc)}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Version History">
                      <IconButton size="small" onClick={() => setHistoryDocument(doc)}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Replace">
                      <IconButton size="small" onClick={() => setReplacingDocument(doc)}>
                        <ChangeCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingDocument(doc)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UploadProductDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
      />

      <ReplaceProductDocumentDialog
        document={replacingDocument}
        onClose={() => setReplacingDocument(null)}
        onSubmit={handleReplace}
      />

      <DeleteProductDocumentDialog
        document={deletingDocument}
        onClose={() => setDeletingDocument(null)}
        onConfirm={handleDelete}
      />

      <ProductDocumentVersionHistoryDialog
        documentId={historyDocument?.id ?? null}
        documentFileName={historyDocument?.fileName ?? null}
        onClose={() => setHistoryDocument(null)}
        onDownloadVersion={handleDownloadVersion}
      />

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
