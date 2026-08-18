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
import type { PerformanceTestListItem } from '../../types/performanceTesting';

interface DeletePerformanceTestDialogProps {
  performanceTest: PerformanceTestListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeletePerformanceTestDialog({
  performanceTest,
  onClose,
  onConfirm,
}: DeletePerformanceTestDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (performanceTest) {
      setError(null);
      setDeleting(false);
    }
  }, [performanceTest]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete performance test.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(performanceTest)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Performance Test</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{performanceTest?.name}</strong>? Its entire run
          history will also be deleted. This action cannot be undone.
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
