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
import type { ApiOrganization } from '../../types/organization';

interface DeleteOrganizationDialogProps {
  organization: ApiOrganization | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteOrganizationDialog({
  organization,
  onClose,
  onConfirm,
}: DeleteOrganizationDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (organization) {
      setError(null);
      setDeleting(false);
    }
  }, [organization]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(organization)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Organization</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{organization?.name}</strong>? This action
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
