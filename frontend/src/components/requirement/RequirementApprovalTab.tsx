import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { updateRequirement, reviewRequirement } from '../../api/requirements';
import { ApiError } from '../../api/client';
import type { ApiRequirement, ReviewDecision } from '../../types/requirement';

interface RequirementApprovalTabProps {
  requirement: ApiRequirement;
  onChanged: () => void;
}

const DECISION_LABELS: Record<ReviewDecision, string> = {
  APPROVED: 'Approve',
  REJECTED: 'Reject',
  RETURNED_FOR_REWORK: 'Return for Rework',
};

export function RequirementApprovalTab({ requirement, onChanged }: RequirementApprovalTabProps) {
  const { hasPermission } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const canApprove = hasPermission('requirements:approve');

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await updateRequirement(requirement.id, { status: 'IN_REVIEW' });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDecisionDialog = (decision: ReviewDecision) => {
    setPendingDecision(decision);
    setComment('');
    setCommentError(null);
  };

  const handleConfirmDecision = async () => {
    if (!pendingDecision) return;
    const trimmedComment = comment.trim();
    if (pendingDecision !== 'APPROVED' && !trimmedComment) {
      setCommentError('A comment is required to reject or return a requirement for rework.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await reviewRequirement(requirement.id, pendingDecision, trimmedComment || undefined);
      setPendingDecision(null);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to record the review decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Current Status
          </Typography>
          <Typography variant="body2">{requirement.status.replace('_', ' ')}</Typography>
        </Box>

        {requirement.reviewedBy && (
          <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Reviewer
              </Typography>
              <Typography variant="body2">{requirement.reviewedBy.name}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="body2">
                {requirement.reviewedAt ? new Date(requirement.reviewedAt).toLocaleString() : '—'}
              </Typography>
            </Box>
            {requirement.reviewComment && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Comment
                </Typography>
                <Typography variant="body2">{requirement.reviewComment}</Typography>
              </Box>
            )}
          </Stack>
        )}

        {requirement.status === 'DRAFT' && (
          <Button
            variant="contained"
            onClick={handleSubmitForReview}
            disabled={submitting}
            sx={{ alignSelf: 'flex-start' }}
          >
            Submit for Review
          </Button>
        )}

        {requirement.status === 'IN_REVIEW' && canApprove && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="success"
              disabled={submitting}
              onClick={() => openDecisionDialog('APPROVED')}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={submitting}
              onClick={() => openDecisionDialog('REJECTED')}
            >
              Reject
            </Button>
            <Button
              variant="outlined"
              disabled={submitting}
              onClick={() => openDecisionDialog('RETURNED_FOR_REWORK')}
            >
              Return for Rework
            </Button>
          </Stack>
        )}

        {requirement.status === 'IN_REVIEW' && !canApprove && (
          <Alert severity="info">
            This requirement is awaiting review. You do not have permission to approve, reject, or
            return it for rework.
          </Alert>
        )}
      </Stack>

      <Dialog open={Boolean(pendingDecision)} onClose={() => setPendingDecision(null)} fullWidth maxWidth="xs">
        <DialogTitle>{pendingDecision ? DECISION_LABELS[pendingDecision] : ''} Requirement</DialogTitle>
        <DialogContent>
          <TextField
            label={pendingDecision === 'APPROVED' ? 'Comment (optional)' : 'Reason (required)'}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
            value={comment}
            error={Boolean(commentError)}
            helperText={commentError ?? ' '}
            onChange={(e) => {
              setComment(e.target.value);
              if (commentError) setCommentError(null);
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingDecision(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmDecision} disabled={submitting}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
