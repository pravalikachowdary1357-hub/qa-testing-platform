import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ApiTestPlan, TestPlanReviewDecision } from '../../types/testPlan';

const DECISIONS: { value: TestPlanReviewDecision; label: string }[] = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'RETURNED_FOR_REWORK', label: 'Return for rework' },
  { value: 'REJECTED', label: 'Reject' },
];

interface ReviewProps {
  plan: ApiTestPlan | null;
  onClose: () => void;
  onSubmit: (decision: TestPlanReviewDecision, comment: string) => Promise<void>;
}

// Approve / return / reject something that is waiting for the Test Manager.
export function ReviewDecisionDialog({
  open,
  title,
  itemName,
  details,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  itemName: string;
  details?: ReactNode;
  onClose: () => void;
  onSubmit: (decision: TestPlanReviewDecision, comment: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<TestPlanReviewDecision>('APPROVED');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDecision('APPROVED');
      setComment('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const needsComment = decision !== 'APPROVED';
  const submit = async () => {
    if (needsComment && !comment.trim()) {
      setError('Explain why in a comment.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(decision, comment.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save the decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {itemName}
          </Typography>
          {details}
          <RadioGroup
            row
            value={decision}
            onChange={(e) => setDecision(e.target.value as TestPlanReviewDecision)}
          >
            {DECISIONS.map((d) => (
              <FormControlLabel key={d.value} value={d.value} control={<Radio />} label={d.label} />
            ))}
          </RadioGroup>
          <TextField
            label={needsComment ? 'Comment (required)' : 'Comment (optional)'}
            fullWidth
            multiline
            minRows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          Save decision
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TestPlanReviewDialog({ plan, onClose, onSubmit }: ReviewProps) {
  return (
    <ReviewDecisionDialog
      open={Boolean(plan)}
      title="Review test plan"
      itemName={plan?.name ?? ''}
      details={
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Exit (completion) criteria
          </Typography>
          {plan?.exitCriteria ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {plan.exitCriteria}
            </Typography>
          ) : (
            <Alert severity="warning" sx={{ mt: 0.5 }}>
              No exit criteria defined — the plan cannot be approved until they are added.
            </Alert>
          )}
        </Box>
      }
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

export function TestPlanCompleteDialog({
  plan,
  onClose,
  onSubmit,
}: {
  plan: ApiTestPlan | null;
  onClose: () => void;
  onSubmit: (summary: string) => Promise<void>;
}) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (plan) {
      setSummary('');
      setError(null);
      setBusy(false);
    }
  }, [plan]);

  const submit = async () => {
    if (!summary.trim()) {
      setError('Describe how the completion criteria were met.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(summary.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign off.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(plan)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Sign off test completion</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {plan?.name}
          </Typography>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Exit (completion) criteria
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {plan?.exitCriteria || '—'}
            </Typography>
          </Box>
          <TextField
            label="Completion summary (required)"
            helperText="How the exit criteria were met, residual risks, open items"
            fullWidth
            multiline
            minRows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          Sign off completion
        </Button>
      </DialogActions>
    </Dialog>
  );
}
