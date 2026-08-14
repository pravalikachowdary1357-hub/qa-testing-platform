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
import type { ApiTestExecution } from '../../types/testExecution';

interface DeleteTestExecutionDialogProps {
  testExecution: ApiTestExecution | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteTestExecutionDialog({
  testExecution,
  onClose,
  onConfirm,
}: DeleteTestExecutionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (testExecution) {
      setError(null);
      setDeleting(false);
    }
  }, [testExecution]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete test execution.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(testExecution)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete Test Execution</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete the execution of{' '}
          <strong>{testExecution?.testCase.title}</strong>? This action cannot be undone.
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
