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
import type { UatTestCase } from '../../types/uat';

interface DeleteUatTestCaseDialogProps {
  testCase: UatTestCase | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteUatTestCaseDialog({
  testCase,
  onClose,
  onConfirm,
}: DeleteUatTestCaseDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (testCase) {
      setError(null);
      setDeleting(false);
    }
  }, [testCase]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete UAT test case.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(testCase)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete UAT Test Case</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>
          Are you sure you want to delete <strong>{testCase?.title}</strong>? A test case with
          recorded executions cannot be deleted until they are removed first. This action cannot be
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
