import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { fetchRequirementVersions } from '../../api/requirements';
import { ApiError } from '../../api/client';
import type { ApiRequirementVersion } from '../../types/requirement';

interface RequirementVersionHistoryTabProps {
  requirementId: string;
}

export function RequirementVersionHistoryTab({ requirementId }: RequirementVersionHistoryTabProps) {
  const [versions, setVersions] = useState<ApiRequirementVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVersions(null);
    setError(null);

    fetchRequirementVersions(requirementId)
      .then((data) => {
        if (!cancelled) setVersions(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load version history (HTTP ${err.status}).`
            : 'Failed to load version history. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requirementId]);

  const isLoading = versions === null && !error;

  return (
    <Box>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {versions && versions.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <HistoryOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No version history yet.</Typography>
        </Paper>
      )}

      {versions && versions.length > 0 && (
        <Stack spacing={2}>
          {versions.map((version) => (
            <Paper key={version.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <Chip label={`Version ${version.version}`} size="small" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  {version.changedBy ? version.changedBy.name : 'System'} ·{' '}
                  {new Date(version.changedAt).toLocaleString()}
                </Typography>
              </Stack>

              {version.changes && version.changes.length > 0 ? (
                <Stack component="ul" spacing={0.5} sx={{ pl: 3, m: 0 }}>
                  {version.changes.map((change, index) => (
                    <Typography component="li" variant="body2" key={index}>
                      {change.field}: {String(change.previousValue ?? '—')} →{' '}
                      {String(change.newValue ?? '—')}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {version.summary}
                </Typography>
              )}

              {version.comment && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  "{version.comment}"
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
