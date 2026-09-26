import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchIntegrations } from '../../../api/adminConfig';
import type { ApiIntegration } from '../../../types/adminConfig';

const STATUS: Record<ApiIntegration['status'], { label: string; color: 'success' | 'warning' | 'default' }> = {
  CONNECTED: { label: 'Connected', color: 'success' },
  NOT_CONFIGURED: { label: 'Not configured', color: 'warning' },
  DISABLED: { label: 'Disabled', color: 'default' },
};

// Lists only integrations TestSphere actually implements. Their credentials
// are deployment environment variables and are never shown or editable here.
export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<ApiIntegration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations()
      .then(setIntegrations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load integrations.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!integrations) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {integrations.map((i) => (
        <Paper key={i.key} variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {i.name}
            </Typography>
            <Chip size="small" label={STATUS[i.status].label} color={STATUS[i.status].color} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {i.description}
          </Typography>
          {typeof i.details.model === 'string' && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Model: {i.details.model}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Configured by the deployment: {i.configuredVia}
          </Typography>
        </Paper>
      ))}
      <Alert severity="info">
        Other integrations (for example CI/CD or issue trackers) are not built into TestSphere yet.
      </Alert>
    </Stack>
  );
}
