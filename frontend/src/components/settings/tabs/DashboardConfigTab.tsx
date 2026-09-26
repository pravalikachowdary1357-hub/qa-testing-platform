import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  clearDashboardRoleOverride,
  fetchDashboardConfig,
  updateDashboardConfig,
} from '../../../api/adminConfig';
import { fetchRoles } from '../../../api/roles';
import type { ApiDashboardConfig, DashboardSectionKey } from '../../../types/adminConfig';
import type { ApiRole } from '../../../types/settings';

const DEFAULT_SCOPE = '__default__';

// Controls which sections of the product testing dashboard are shown --
// for everyone (default) or for a specific role. It changes visibility
// only, never KPI definitions or calculations.
export function DashboardConfigTab() {
  const [config, setConfig] = useState<ApiDashboardConfig | null>(null);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [hidden, setHidden] = useState<Set<DashboardSectionKey>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    Promise.all([fetchDashboardConfig(), fetchRoles().catch(() => [] as ApiRole[])])
      .then(([c, r]) => {
        setConfig(c);
        setRoles(r);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard layout.'));
  }, []);

  const overrides = config?.roleOverrides ?? {};
  const saved: DashboardSectionKey[] = useMemo(() => {
    if (!config) return [];
    if (scope === DEFAULT_SCOPE) return config.globalHiddenSections ?? config.hiddenSections;
    return overrides[scope] ?? config.globalHiddenSections ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, scope]);

  useEffect(() => setHidden(new Set(saved)), [saved]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasOverride = scope !== DEFAULT_SCOPE && Boolean(overrides[scope]);
  const dirty = hidden.size !== saved.length || saved.some((s) => !hidden.has(s)) || (scope !== DEFAULT_SCOPE && !hasOverride && hidden.size > 0);

  const save = async () => {
    setSaving(true);
    try {
      setConfig(await updateDashboardConfig([...hidden], scope === DEFAULT_SCOPE ? undefined : scope));
      setMessage({ text: 'Dashboard layout saved.' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to save.', error: true });
    } finally {
      setSaving(false);
    }
  };

  const resetRole = async () => {
    setSaving(true);
    try {
      setConfig(await clearDashboardRoleOverride(scope));
      setMessage({ text: 'Role now uses the default layout.' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to reset.', error: true });
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
        Choose which dashboard sections are shown. Metrics and KPI calculations are not changed.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
        <TextField
          select
          size="small"
          label="Applies to"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value={DEFAULT_SCOPE}>All roles (default)</MenuItem>
          {roles.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name}
              {overrides[r.id] ? ' — custom' : ''}
            </MenuItem>
          ))}
        </TextField>
        {scope !== DEFAULT_SCOPE && (
          <Chip
            size="small"
            label={hasOverride ? 'Custom layout for this role' : 'Uses the default layout'}
            color={hasOverride ? 'primary' : 'default'}
          />
        )}
      </Stack>

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
        <Button variant="contained" disabled={saving || (!dirty && !(scope !== DEFAULT_SCOPE && !hasOverride))} onClick={() => void save()}>
          Save
        </Button>
        <Button disabled={!dirty || saving} onClick={() => setHidden(new Set(saved))}>
          Cancel
        </Button>
        {hasOverride && (
          <Button color="warning" disabled={saving} onClick={() => void resetRole()}>
            Use default layout for this role
          </Button>
        )}
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
