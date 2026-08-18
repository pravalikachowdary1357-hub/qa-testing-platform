import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { fetchAppSettings, updateAppSettings } from '../../../api/appSettings';
import type { ApiAppSettings, UpdateAppSettingsPayload } from '../../../types/settings';

const ENVIRONMENT_TYPES = ['DEVELOPMENT', 'QA', 'STAGING', 'UAT', 'PRODUCTION'];
const TEST_CASE_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const DEFECT_SEVERITIES = ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'];

const EDITABLE_KEYS = [
  'defaultEnvironmentType',
  'defaultTestCasePriority',
  'defaultDefectSeverity',
  'notifyOnDefectCreated',
  'notifyOnReleaseReadinessChange',
  'notifyOnTestExecutionFailure',
] as const;

function toPayload(settings: ApiAppSettings): UpdateAppSettingsPayload {
  const payload: UpdateAppSettingsPayload = {};
  for (const key of EDITABLE_KEYS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (payload as any)[key] = settings[key];
  }
  return payload;
}

export function AppSettingsTab() {
  const [settings, setSettings] = useState<ApiAppSettings | null>(null);
  const [form, setForm] = useState<UpdateAppSettingsPayload>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setError(null);
    fetchAppSettings()
      .then((data) => {
        setSettings(data);
        setForm(toPayload(data));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load application settings.'));
  };

  useEffect(load, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateAppSettings(form);
      setSettings(updated);
      setForm(toPayload(updated));
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save application settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) setForm(toPayload(settings));
    setSuccess(false);
    setError(null);
  };

  if (error && !settings) return <Alert severity="error">{error}</Alert>;
  if (!settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(toPayload(settings));

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Application settings saved.
        </Alert>
      )}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Testing Defaults
        </Typography>
        <TextField
          select
          label="Default Environment"
          value={form.defaultEnvironmentType ?? ''}
          onChange={(e) =>
            setForm((f) => ({ ...f, defaultEnvironmentType: e.target.value || undefined }))
          }
          fullWidth
        >
          <MenuItem value="">Not set</MenuItem>
          {ENVIRONMENT_TYPES.map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Default Test Case Priority"
          value={form.defaultTestCasePriority ?? 'MEDIUM'}
          onChange={(e) => setForm((f) => ({ ...f, defaultTestCasePriority: e.target.value }))}
          fullWidth
        >
          {TEST_CASE_PRIORITIES.map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Default Defect Severity"
          value={form.defaultDefectSeverity ?? 'MAJOR'}
          onChange={(e) => setForm((f) => ({ ...f, defaultDefectSeverity: e.target.value }))}
          fullWidth
        >
          {DEFECT_SEVERITIES.map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>

        <Divider />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Notification Preferences
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={form.notifyOnDefectCreated ?? true}
              onChange={(e) => setForm((f) => ({ ...f, notifyOnDefectCreated: e.target.checked }))}
            />
          }
          label="Notify when a new defect is created"
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.notifyOnReleaseReadinessChange ?? true}
              onChange={(e) =>
                setForm((f) => ({ ...f, notifyOnReleaseReadinessChange: e.target.checked }))
              }
            />
          }
          label="Notify when release readiness changes"
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.notifyOnTestExecutionFailure ?? true}
              onChange={(e) =>
                setForm((f) => ({ ...f, notifyOnTestExecutionFailure: e.target.checked }))
              }
            />
          }
          label="Notify on test execution failure"
        />

        <Box>
          <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
            Save
          </Button>
          <Button sx={{ ml: 1 }} onClick={handleCancel} disabled={!isDirty || saving}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
