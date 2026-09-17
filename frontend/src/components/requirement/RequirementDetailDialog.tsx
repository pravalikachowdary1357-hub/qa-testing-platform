import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { ProductDetailDialog } from '../product/ProductDetailDialog';
import { RequirementAttachmentsTab } from './RequirementAttachmentsTab';
import { RequirementVersionHistoryTab } from './RequirementVersionHistoryTab';
import { RequirementActivityTab } from './RequirementActivityTab';
import { RequirementApprovalTab } from './RequirementApprovalTab';
import { RequirementTraceabilityTab } from './RequirementTraceabilityTab';
import { fetchRequirement } from '../../api/requirements';
import { ApiError } from '../../api/client';
import type {
  ApiRequirement,
  RequirementPriority,
  RequirementRisk,
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

const RISK_LABELS: Record<string, RequirementRisk> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const STATUS_LABELS: Record<string, RequirementStatus> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
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
  const [activeTab, setActiveTab] = useState(0);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setActiveTab(0);
  }, [requirementId]);

  useEffect(() => {
    if (!requirementId) {
      setRequirement(null);
      setError(null);
      return;
    }

    let cancelled = false;
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
  }, [requirementId, reloadToken]);

  const handleChanged = () => setReloadToken((t) => t + 1);

  return (
    <Dialog open={Boolean(requirementId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0 }}>Requirement Workspace</DialogTitle>

      {requirement && (
        <Tabs
          value={activeTab}
          onChange={(_e, value: number) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Acceptance Criteria" />
          <Tab label="Attachments" />
          <Tab label="Version History" />
          <Tab label="Activity" />
          <Tab label="Approval" />
          <Tab label="Traceability" />
        </Tabs>
      )}

      <DialogContent>
        {!requirement && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {requirement && activeTab === 1 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Acceptance Criteria
            </Typography>
            {(requirement.acceptanceCriteria ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No acceptance criteria added yet. Use Edit Requirement to add some.
              </Typography>
            ) : (
              <Stack component="ol" spacing={1} sx={{ pl: 3, m: 0 }}>
                {(requirement.acceptanceCriteria ?? []).map((criterion) => (
                  <Typography component="li" variant="body2" key={criterion.id}>
                    {criterion.text}
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {requirement && activeTab === 2 && <RequirementAttachmentsTab requirementId={requirement.id} />}

        {requirement && activeTab === 3 && (
          <RequirementVersionHistoryTab requirementId={requirement.id} />
        )}

        {requirement && activeTab === 4 && <RequirementActivityTab requirementId={requirement.id} />}

        {requirement && activeTab === 5 && (
          <RequirementApprovalTab requirement={requirement} onChanged={handleChanged} />
        )}

        {requirement && activeTab === 6 && (
          <RequirementTraceabilityTab
            requirementId={requirement.id}
            productId={requirement.productId}
          />
        )}

        {requirement && activeTab === 0 && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6">{requirement.title}</Typography>
                <Chip label={`v${requirement.version}`} size="small" variant="outlined" />
              </Stack>
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

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <StatusChip status={TYPE_LABELS[requirement.type]} />
              <StatusChip status={PRIORITY_LABELS[requirement.priority]} />
              <StatusChip status={RISK_LABELS[requirement.riskLevel]} />
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

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Owner
                </Typography>
                <Typography variant="body2">
                  {requirement.owner
                    ? `${requirement.owner.name}${requirement.owner.status === 'INACTIVE' ? ' (Inactive)' : ''}`
                    : '—'}
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
            </Stack>

            <Divider />

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
