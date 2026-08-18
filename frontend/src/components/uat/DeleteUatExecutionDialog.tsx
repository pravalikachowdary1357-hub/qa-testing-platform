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
import type { UatExecution } from '../../types/uat';

interface DeleteUatExecutionDialogProps {
  execution: UatExecution | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteUatExecutionDialog({
  execution,
  onClose,
  onConfirm,
}: DeleteUatExecutionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (execution) {
      setError(null);
      setDeleting(false);
    }
  }, [execution]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete UAT execution.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(execution)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete UAT Execution</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete this execution record? This action cannot be undone.
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
