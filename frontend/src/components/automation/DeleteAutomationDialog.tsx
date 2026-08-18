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
import type { ApiAutomationListItem } from '../../types/automation';

interface DeleteAutomationDialogProps {
  automation: ApiAutomationListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAutomationDialog({
  automation,
  onClose,
  onConfirm,
}: DeleteAutomationDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (automation) {
      setError(null);
      setDeleting(false);
    }
  }, [automation]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete automation.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(automation)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Automation</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{automation?.name}</strong>? Its run history will
          also be deleted. This action cannot be undone.
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
