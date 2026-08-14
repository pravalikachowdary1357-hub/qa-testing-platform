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
import type { ApiRequirement } from '../../types/requirement';

interface DeleteRequirementDialogProps {
  requirement: ApiRequirement | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteRequirementDialog({
  requirement,
  onClose,
  onConfirm,
}: DeleteRequirementDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (requirement) {
      setError(null);
      setDeleting(false);
    }
  }, [requirement]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete requirement.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(requirement)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Requirement</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{requirement?.title}</strong>? This action
          cannot be undone.
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
