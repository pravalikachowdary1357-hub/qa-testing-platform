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
import type { ApiEnvironment } from '../../types/environment';

interface DeleteEnvironmentDialogProps {
  environment: ApiEnvironment | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteEnvironmentDialog({
  environment,
  onClose,
  onConfirm,
}: DeleteEnvironmentDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (environment) {
      setError(null);
      setDeleting(false);
    }
  }, [environment]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete environment.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(environment)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Environment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{environment?.name}</strong>? This action cannot
          be undone.
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
