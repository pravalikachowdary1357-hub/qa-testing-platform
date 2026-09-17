import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import {
  deleteRequirementAttachment,
  downloadRequirementAttachment,
  fetchRequirementAttachments,
  uploadRequirementAttachment,
} from '../../api/requirements';
import { ApiError } from '../../api/client';
import type { ApiRequirementAttachment } from '../../types/requirement';

const MAX_ATTACHMENT_SIZE_MB = 4;
const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

interface RequirementAttachmentsTabProps {
  requirementId: string;
}

export function RequirementAttachmentsTab({ requirementId }: RequirementAttachmentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<ApiRequirementAttachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState<ApiRequirementAttachment | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchRequirementAttachments(requirementId)
      .then((data) => setAttachments(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load attachments (HTTP ${err.status}).`
            : 'Failed to load attachments. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setAttachments(null);
    setError(null);

    fetchRequirementAttachments(requirementId)
      .then((data) => {
        if (!cancelled) setAttachments(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load attachments (HTTP ${err.status}).`
            : 'Failed to load attachments. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requirementId]);

  const isLoading = attachments === null && !error;

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    if (file.size === 0) {
      setSnackbar({ message: 'The selected file is empty.', severity: 'error' });
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setSnackbar({
        message: `File exceeds the maximum allowed size of ${MAX_ATTACHMENT_SIZE_MB}MB.`,
        severity: 'error',
      });
      return;
    }

    setUploading(true);
    try {
      await uploadRequirementAttachment(requirementId, file);
      await load();
      setSnackbar({ message: 'Attachment added.', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Upload failed (HTTP ${err.status}).` : 'Upload failed.',
        severity: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleView = async (attachment: ApiRequirementAttachment) => {
    setBusyId(attachment.id);
    try {
      const blob = await downloadRequirementAttachment(requirementId, attachment.id);
      openBlob(blob, attachment.fileName, false);
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Failed to open file (HTTP ${err.status}).` : 'Failed to open file.',
        severity: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (attachment: ApiRequirementAttachment) => {
    setBusyId(attachment.id);
    try {
      const blob = await downloadRequirementAttachment(requirementId, attachment.id);
      openBlob(blob, attachment.fileName, true);
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError ? `Failed to download file (HTTP ${err.status}).` : 'Failed to download file.',
        severity: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAttachment) return;
    setDeleting(true);
    try {
      await deleteRequirementAttachment(requirementId, deletingAttachment.id);
      await load();
      setDeletingAttachment(null);
      setSnackbar({ message: 'Attachment removed.', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Failed to remove file (HTTP ${err.status}).` : 'Failed to remove file.',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Add Attachment'}
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {attachments && attachments.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No attachments added yet.</Typography>
        </Paper>
      )}

      {attachments && attachments.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attachments.map((attachment) => (
                <TableRow key={attachment.id} hover>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {attachment.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(attachment.fileSize)}
                    </Typography>
                  </TableCell>
                  <TableCell>{attachment.uploadedBy}</TableCell>
                  <TableCell>{new Date(attachment.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyId === attachment.id}
                          onClick={() => handleView(attachment)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Download">
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyId === attachment.id}
                          onClick={() => handleDownload(attachment)}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => setDeletingAttachment(attachment)}>
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

      <Dialog
        open={Boolean(deletingAttachment)}
        onClose={() => setDeletingAttachment(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Remove Attachment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <strong>{deletingAttachment?.fileName}</strong>? This
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingAttachment(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm} disabled={deleting}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

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
