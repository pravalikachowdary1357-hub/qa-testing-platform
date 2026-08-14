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
import { fetchEnvironment } from '../../api/environments';
import { ApiError } from '../../api/client';
import type { ApiEnvironment, EnvironmentStatus, EnvironmentType } from '../../types/environment';

const TYPE_LABELS: Record<string, EnvironmentType> = {
  DEVELOPMENT: 'Development',
  QA: 'QA',
  STAGING: 'Staging',
  UAT: 'UAT',
  PRODUCTION: 'Production',
};

const STATUS_LABELS: Record<string, EnvironmentStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};

interface EnvironmentDetailDialogProps {
  environmentId: string | null;
  onClose: () => void;
}

export function EnvironmentDetailDialog({ environmentId, onClose }: EnvironmentDetailDialogProps) {
  const [environment, setEnvironment] = useState<ApiEnvironment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!environmentId) {
      setEnvironment(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setEnvironment(null);
    setError(null);

    fetchEnvironment(environmentId)
      .then((data) => {
        if (!cancelled) setEnvironment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load environment (HTTP ${err.status}).`
            : 'Failed to load environment. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  return (
    <Dialog open={Boolean(environmentId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Environment Details</DialogTitle>
      <DialogContent>
        {!environment && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {environment && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{environment.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {environment.product.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={TYPE_LABELS[environment.type]} />
              <StatusChip status={STATUS_LABELS[environment.status]} />
            </Stack>

            {environment.baseUrl && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Base URL
                </Typography>
                <Link href={environment.baseUrl} target="_blank" rel="noopener noreferrer">
                  {environment.baseUrl}
                </Link>
              </Box>
            )}

            {environment.description && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {environment.description}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(environment.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(environment.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
