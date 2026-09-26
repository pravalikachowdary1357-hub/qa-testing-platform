import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { fetchIntegrations } from '../../../api/adminConfig';
import type { ApiIntegration } from '../../../types/adminConfig';

const STATUS: Record<ApiIntegration['status'], { label: string; color: 'success' | 'warning' | 'default' | 'info' }> = {
  CONNECTED: { label: 'Connected', color: 'success' },
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
// implemented integrations can ever show "Connected"; credentials are
// deployment environment variables and are never shown or editable here.
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
                  {i.configuredVia && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Configured by the deployment: {i.configuredVia}
                    </Typography>
                  )}
                </Paper>
              ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
