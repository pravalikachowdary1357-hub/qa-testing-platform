import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { ProductDetailDialog } from '../product/ProductDetailDialog';
import { fetchRequirement } from '../../api/requirements';
import { ApiError } from '../../api/client';
import type {
  ApiRequirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from '../../types/requirement';

const TYPE_LABELS: Record<string, RequirementType> = {
  FUNCTIONAL: 'Functional',
  NON_FUNCTIONAL: 'Non-Functional',
  BUSINESS: 'Business',
  TECHNICAL: 'Technical',
};

const PRIORITY_LABELS: Record<string, RequirementPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<string, RequirementStatus> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

interface RequirementDetailDialogProps {
  requirementId: string | null;
  onClose: () => void;
}

export function RequirementDetailDialog({
  requirementId,
  onClose,
}: RequirementDetailDialogProps) {
  const [requirement, setRequirement] = useState<ApiRequirement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!requirementId) {
      setRequirement(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setRequirement(null);
    setError(null);

    fetchRequirement(requirementId)
      .then((data) => {
        if (!cancelled) setRequirement(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load requirement (HTTP ${err.status}).`
            : 'Failed to load requirement. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requirementId]);

  return (
    <Dialog open={Boolean(requirementId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Requirement Details</DialogTitle>
      <DialogContent>
        {!requirement && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {requirement && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{requirement.title}</Typography>
              <Link
                component="button"
                type="button"
                variant="body2"
                color="text.secondary"
                underline="hover"
                onClick={() => setViewingProductId(requirement.productId)}
              >
                {requirement.product.name}
              </Link>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={TYPE_LABELS[requirement.type]} />
              <StatusChip status={PRIORITY_LABELS[requirement.priority]} />
              <StatusChip status={STATUS_LABELS[requirement.status]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {requirement.description}
              </Typography>
            </Box>

            {requirement.release && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Release
                </Typography>
                <Typography variant="body2">
                  {requirement.release.name} ({requirement.release.version})
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(requirement.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(requirement.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <ProductDetailDialog productId={viewingProductId} onClose={() => setViewingProductId(null)} />
    </Dialog>
  );
}
