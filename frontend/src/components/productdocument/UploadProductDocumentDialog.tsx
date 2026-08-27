import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { ApiProductDocumentStatus, ApiProductDocumentType } from '../../types/productDocument';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  formatFileSize,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from './productDocumentLabels';

const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS) as [
  ApiProductDocumentType,
  string,
][];

const STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_LABELS) as [
  ApiProductDocumentStatus,
  string,
][];

interface UploadProductDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    file: File;
    documentType: ApiProductDocumentType;
    description: string;
    status: ApiProductDocumentStatus;
  }) => Promise<void>;
}

export function UploadProductDocumentDialog({
  open,
  onClose,
  onSubmit,
}: UploadProductDocumentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<ApiProductDocumentType>('PRODUCT_REQUIREMENTS_BRD');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ApiProductDocumentStatus>('DRAFT');
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setDocumentType('PRODUCT_REQUIREMENTS_BRD');
      setDescription('');
      setStatus('DRAFT');
      setFileError(null);
      setSubmitError(null);
      setUploading(false);
    }
  }, [open]);

  const handleFileChange = (selected: File | null) => {
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size === 0) {
      setFileError('The selected file is empty.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      setFileError(`File exceeds the maximum allowed size of ${MAX_DOCUMENT_FILE_SIZE_MB}MB.`);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      setFileError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setSubmitError(null);

    try {
      await onSubmit({ file, documentType, description: description.trim(), status });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to upload the document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload File</DialogTitle>
      <DialogContent>
        {uploading && <LinearProgress sx={{ mb: 2 }} />}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Choose File
            </Button>
            {file && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.5 }}>
                <InsertDriveFileIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {file.name} ({formatFileSize(file.size)})
                </Typography>
              </Stack>
            )}
            {fileError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {fileError}
              </Typography>
            )}
            {!fileError && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Maximum file size: {MAX_DOCUMENT_FILE_SIZE_MB}MB.
              </Typography>
            )}
          </Box>

          <TextField
            select
            label="Document Type"
            required
            fullWidth
            value={documentType}
            disabled={uploading}
            onChange={(e) => setDocumentType(e.target.value as ApiProductDocumentType)}
          >
            {DOCUMENT_TYPE_OPTIONS.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={description}
            disabled={uploading}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            select
            label="Status"
            fullWidth
            value={status}
            disabled={uploading}
            onChange={(e) => setStatus(e.target.value as ApiProductDocumentStatus)}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={uploading || !file}>
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
