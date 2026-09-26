import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchIntegrations } from '../../../api/adminConfig';
import type { ApiIntegration } from '../../../types/adminConfig';
import { CommunicationIntegrations } from '../CommunicationIntegrations';

const STATUS: Record<
  ApiIntegration['status'],
  { label: string; color: 'success' | 'warning' | 'default' | 'info' | 'error' }
> = {
  CONNECTED: { label: 'Connected', color: 'success' },
  CONFIGURED: { label: 'Configured, not tested yet', color: 'info' },
  ERROR: { label: 'Last delivery failed', color: 'error' },
  NOT_CONFIGURED: { label: 'Not configured', color: 'warning' },
  DISABLED: { label: 'Disabled', color: 'default' },
  REFERENCE_ONLY: { label: 'Reference links only', color: 'info' },
  NOT_AVAILABLE: { label: 'Not available yet', color: 'default' },
};

const LEVEL: Record<ApiIntegration['level'], string> = {
  IMPLEMENTED: 'Implemented integration',
  FOUNDATION: 'Configuration foundation',
  FUTURE: 'Future integration',
};

const CATEGORY_ORDER = ['AI', 'Development', 'Issue tracking', 'CI/CD', 'Automation', 'Communication'];

// Integration targets from the TestSphere requirements. Only genuinely
// implemented integrations can ever show "Connected" (for Teams, Slack and
// email: only after a real delivery succeeded). Secrets are never shown.
export function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<ApiIntegration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchIntegrations()
      .then(setIntegrations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load integrations.'));
  };
  useEffect(load, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!integrations) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const categories = CATEGORY_ORDER.filter((c) => integrations.some((i) => i.category === c));

  return (
    <Stack spacing={3}>
      {categories.map((category) => (
        <Box key={category}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {category}
          </Typography>
          <Stack spacing={1.5}>
            {integrations
              .filter((i) => i.category === category)
              .map((i) => (
                <Paper key={i.key} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{i.name}</Typography>
                    <Chip size="small" label={STATUS[i.status].label} color={STATUS[i.status].color} />
                    <Chip size="small" variant="outlined" label={LEVEL[i.level]} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {i.description}
                  </Typography>
                  {typeof i.details?.model === 'string' && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Model: {i.details.model}
                    </Typography>
                  )}
                  {typeof i.details?.productsWithRepositoryUrl === 'number' && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Products with a repository link: {i.details.productsWithRepositoryUrl}
                    </Typography>
                  )}
                  {typeof i.details?.webhooks === 'number' && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Enabled webhooks: {i.details.webhooks}
                    </Typography>
                  )}
                  {i.configuredVia && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Set up via: {i.configuredVia}
                    </Typography>
                  )}
                </Paper>
              ))}
          </Stack>
          {category === 'Communication' && (
            <Box sx={{ mt: 2 }}>
              <CommunicationIntegrations onChanged={load} />
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
