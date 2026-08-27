import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { StatusChip } from '../common/StatusChip';
import { fetchProductDocumentVersions } from '../../api/productDocuments';
import { ApiError } from '../../api/client';
import type { ApiProductDocumentVersionEntry } from '../../types/productDocument';
import { DOCUMENT_STATUS_LABELS, formatFileSize } from './productDocumentLabels';

interface ProductDocumentVersionHistoryDialogProps {
  documentId: string | null;
  documentFileName: string | null;
  onClose: () => void;
  onDownloadVersion: (entry: ApiProductDocumentVersionEntry) => void;
}

export function ProductDocumentVersionHistoryDialog({
  documentId,
  documentFileName,
  onClose,
  onDownloadVersion,
}: ProductDocumentVersionHistoryDialogProps) {
  const [versions, setVersions] = useState<ApiProductDocumentVersionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setVersions(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setVersions(null);
    setError(null);

    fetchProductDocumentVersions(documentId)
      .then((data) => {
        if (!cancelled) setVersions(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load version history (HTTP ${err.status}).`
            : 'Failed to load version history.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (
    <Dialog open={Boolean(documentId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          Version History
          {documentFileName && (
            <Typography variant="body2" color="text.secondary">
              {documentFileName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!versions && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {versions && (
          <List disablePadding>
            {versions.map((entry) => (
              <ListItem
                key={entry.id}
                divider
                secondaryAction={
                  <Tooltip title="Download this version">
                    <IconButton edge="end" onClick={() => onDownloadVersion(entry)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        v{entry.version}
                      </Typography>
                      {entry.isCurrent && <Chip label="Current" size="small" color="primary" />}
                      <StatusChip status={DOCUMENT_STATUS_LABELS[entry.status]} />
                    </Stack>
                  }
                  secondary={
                    <>
                      {entry.fileName} · {formatFileSize(entry.fileSize)}
                      <br />
                      Uploaded by {entry.uploadedBy} on {new Date(entry.uploadedAt).toLocaleString()}
                      {entry.description && (
                        <>
                          <br />
                          {entry.description}
                        </>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
