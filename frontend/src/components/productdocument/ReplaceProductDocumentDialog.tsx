import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { ApiProductDocument, ApiProductDocumentStatus } from '../../types/productDocument';
import {
  DOCUMENT_STATUS_LABELS,
  formatFileSize,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from './productDocumentLabels';

const STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_LABELS) as [
  ApiProductDocumentStatus,
  string,
][];

interface ReplaceProductDocumentDialogProps {
  document: ApiProductDocument | null;
  onClose: () => void;
  onSubmit: (values: {
    file: File;
    description: string;
    relatedVersion: string;
    status: ApiProductDocumentStatus;
  }) => Promise<void>;
}

export function ReplaceProductDocumentDialog({
  document,
  onClose,
  onSubmit,
}: ReplaceProductDocumentDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [relatedVersion, setRelatedVersion] = useState('');
  const [status, setStatus] = useState<ApiProductDocumentStatus>('DRAFT');
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (document) {
      setFile(null);
      setDescription(document.description ?? '');
      setRelatedVersion(document.relatedVersion ?? '');
      setStatus(document.status);
      setFileError(null);
      setSubmitError(null);
      setUploading(false);
    }
  }, [document]);

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
      setFileError('Please select a replacement file.');
      return;
    }

    setUploading(true);
    setSubmitError(null);

    try {
      await onSubmit({
        file,
        description: description.trim(),
        relatedVersion: relatedVersion.trim(),
        status,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to replace the document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={Boolean(document)} onClose={uploading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Replace File</DialogTitle>
      <DialogContent>
        {uploading && <LinearProgress sx={{ mb: 2 }} />}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          Uploading a new file will archive <strong>{document?.fileName}</strong> (v{document?.version}) into its
          version history and set the new file as the current version.
        </DialogContentText>

        <Stack spacing={2.5}>
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
              Choose New File
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
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={description}
            disabled={uploading}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            label="Related Version (optional)"
            fullWidth
            placeholder="e.g. v2.5.1"
            value={relatedVersion}
            disabled={uploading}
            onChange={(e) => setRelatedVersion(e.target.value)}
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
          {uploading ? 'Uploading…' : 'Replace'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
