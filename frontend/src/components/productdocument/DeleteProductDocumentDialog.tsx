import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { ApiProductDocument } from '../../types/productDocument';

interface DeleteProductDocumentDialogProps {
  document: ApiProductDocument | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteProductDocumentDialog({
  document,
  onClose,
  onConfirm,
}: DeleteProductDocumentDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (document) {
      setError(null);
      setDeleting(false);
    }
  }, [document]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete the document.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(document)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete File</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{document?.fileName}</strong>? This will also remove its entire
          version history. This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={handleConfirm} disabled={deleting}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
