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
import type { ApiTestPlan } from '../../types/testPlan';

interface DeleteTestPlanDialogProps {
  testPlan: ApiTestPlan | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteTestPlanDialog({ testPlan, onClose, onConfirm }: DeleteTestPlanDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (testPlan) {
      setError(null);
      setDeleting(false);
    }
  }, [testPlan]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete test plan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(testPlan)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Test Plan</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{testPlan?.name}</strong>? This action cannot be
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
