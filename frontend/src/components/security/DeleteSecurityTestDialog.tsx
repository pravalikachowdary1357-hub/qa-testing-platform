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
import type { SecurityTestListItem } from '../../types/securityTesting';

interface DeleteSecurityTestDialogProps {
  securityTest: SecurityTestListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteSecurityTestDialog({
  securityTest,
  onClose,
  onConfirm,
}: DeleteSecurityTestDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (securityTest) {
      setError(null);
      setDeleting(false);
    }
  }, [securityTest]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete security test.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(securityTest)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Security Test</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{securityTest?.name}</strong>? Its findings will
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
