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
import type { UatCycleListItem } from '../../types/uat';

interface DeleteUatCycleDialogProps {
  cycle: UatCycleListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteUatCycleDialog({ cycle, onClose, onConfirm }: DeleteUatCycleDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (cycle) {
      setError(null);
      setDeleting(false);
    }
  }, [cycle]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete UAT cycle.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(cycle)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete UAT Cycle</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{cycle?.name}</strong>? A cycle with test cases
          cannot be deleted until they are removed first. This action cannot be undone.
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
