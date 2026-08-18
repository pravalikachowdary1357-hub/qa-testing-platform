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
import type { ApiTestRequestListItem } from '../../types/apiTesting';

interface DeleteApiTestRequestDialogProps {
  apiTestRequest: ApiTestRequestListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteApiTestRequestDialog({
  apiTestRequest,
  onClose,
  onConfirm,
}: DeleteApiTestRequestDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (apiTestRequest) {
      setError(null);
      setDeleting(false);
    }
  }, [apiTestRequest]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete API test request.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(apiTestRequest)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete API Test Request</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{apiTestRequest?.name}</strong>? Its entire
          execution history will also be deleted. This action cannot be undone.
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
