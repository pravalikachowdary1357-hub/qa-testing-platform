import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { fetchDashboardConfig, updateDashboardConfig } from '../../../api/adminConfig';
import type { ApiDashboardConfig, DashboardSectionKey } from '../../../types/adminConfig';

// Controls which sections of the product testing dashboard are shown to
// every role. It changes visibility only -- never metrics or calculations.
export function DashboardConfigTab() {
  const [config, setConfig] = useState<ApiDashboardConfig | null>(null);
  const [hidden, setHidden] = useState<Set<DashboardSectionKey>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetchDashboardConfig()
      .then((c) => {
        setConfig(c);
        setHidden(new Set(c.hiddenSections));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard layout.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const dirty =
    hidden.size !== config.hiddenSections.length || config.hiddenSections.some((s) => !hidden.has(s));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateDashboardConfig([...hidden]);
      setConfig(updated);
      setMessage({ text: 'Dashboard layout saved.' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to save.', error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Product testing dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose which sections every role sees on the testing dashboard. Metrics themselves are not changed.
      </Typography>
      <Stack>
        {config.sections.map((section) => (
          <FormControlLabel
            key={section.key}
            control={
              <Switch
                checked={!hidden.has(section.key)}
                onChange={(e) =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.delete(section.key);
                    else next.add(section.key);
                    return next;
                  })
                }
              />
            }
            label={section.label}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="contained" disabled={!dirty || saving} onClick={() => void save()}>
          Save
        </Button>
        <Button disabled={!dirty || saving} onClick={() => setHidden(new Set(config.hiddenSections))}>
          Cancel
        </Button>
      </Stack>
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message ? (
          <Alert severity={message.error ? 'error' : 'success'} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Paper>
  );
}
