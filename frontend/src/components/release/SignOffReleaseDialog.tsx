import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type { ApiRelease, SignOffReleasePayload } from '../../types/release';

interface SignOffReleaseDialogProps {
  release: ApiRelease | null;
  onClose: () => void;
  onConfirm: (data: SignOffReleasePayload) => Promise<void>;
}

export function SignOffReleaseDialog({ release, onClose, onConfirm }: SignOffReleaseDialogProps) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [signOffBy, setSignOffBy] = useState('');
  const [notes, setNotes] = useState('');
  const [signOffByError, setSignOffByError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (release) {
      setDecision('APPROVED');
      setSignOffBy('');
      setNotes('');
      setSignOffByError(null);
      setError(null);
      setSubmitting(false);
    }
  }, [release]);

  const handleConfirm = async () => {
    const trimmedSignOffBy = signOffBy.trim();
    if (!trimmedSignOffBy) {
      setSignOffByError('Your name is required to sign off.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm({ decision, signOffBy: trimmedSignOffBy, signOffNotes: notes.trim() || undefined });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record sign-off.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(release)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Sign Off Release</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          Record the final approval decision for{' '}
          <strong>
            {release?.name} ({release?.version})
          </strong>
          .
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            select
            label="Decision"
            fullWidth
            value={decision}
            onChange={(e) => setDecision(e.target.value as 'APPROVED' | 'REJECTED')}
          >
            <MenuItem value="APPROVED">Approve</MenuItem>
            <MenuItem value="REJECTED">Reject</MenuItem>
          </TextField>
          <TextField
            label="Signed Off By"
            required
            fullWidth
            value={signOffBy}
            error={Boolean(signOffByError)}
            helperText={signOffByError ?? ' '}
            onChange={(e) => {
              setSignOffBy(e.target.value);
              if (signOffByError) setSignOffByError(null);
            }}
          />
          <TextField
            label="Notes (optional)"
            fullWidth
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={decision === 'APPROVED' ? 'success' : 'error'}
          onClick={handleConfirm}
          disabled={submitting}
        >
          {decision === 'APPROVED' ? 'Approve' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
