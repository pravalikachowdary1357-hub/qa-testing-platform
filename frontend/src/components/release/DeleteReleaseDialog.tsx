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
import type { ApiRelease } from '../../types/release';

interface DeleteReleaseDialogProps {
  release: ApiRelease | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteReleaseDialog({ release, onClose, onConfirm }: DeleteReleaseDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (release) {
      setError(null);
      setDeleting(false);
    }
  }, [release]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete release.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(release)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Release</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{release?.name} ({release?.version})</strong>? This
          action cannot be undone.
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
