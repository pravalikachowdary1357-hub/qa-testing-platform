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
import type { ApiDefect } from '../../types/defect';

interface DeleteDefectDialogProps {
  defect: ApiDefect | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDefectDialog({ defect, onClose, onConfirm }: DeleteDefectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (defect) {
      setError(null);
      setDeleting(false);
    }
  }, [defect]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete defect.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(defect)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Defect</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{defect?.title}</strong>? This action cannot be
          undone.
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
