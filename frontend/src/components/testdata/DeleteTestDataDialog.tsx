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
import type { ApiTestDataListItem } from '../../types/testData';

interface DeleteTestDataDialogProps {
  testData: ApiTestDataListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteTestDataDialog({ testData, onClose, onConfirm }: DeleteTestDataDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (testData) {
      setError(null);
      setDeleting(false);
    }
  }, [testData]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete test data.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(testData)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Test Data</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{testData?.name}</strong>? This action cannot be
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
