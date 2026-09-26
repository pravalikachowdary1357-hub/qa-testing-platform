import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { fetchNotificationConfig, updateNotificationConfig } from '../../api/adminConfig';
import { useAuth } from '../../context/AuthContext';
import type { ApiNotificationConfig } from '../../types/adminConfig';

// Notification configuration (Requirements section 24). TestSphere has no
// notification delivery yet, so this records the intended routing only and
// says so plainly -- it never claims anything is sent.
export function NotificationConfigSection() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('app_settings:manage');
  const [config, setConfig] = useState<ApiNotificationConfig | null>(null);
  const [routing, setRouting] = useState<Record<string, string[]>>({});
  const [escalation, setEscalation] = useState('');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const apply = (c: ApiNotificationConfig) => {
    setConfig(c);
    setRouting(c.routing);
    setEscalation(c.escalationAfterDays === null ? '' : String(c.escalationAfterDays));
    setReminder(c.reminderDaysBeforeDue === null ? '' : String(c.reminderDaysBeforeDue));
  };

  useEffect(() => {
    fetchNotificationConfig()
      .then(apply)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notification configuration.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const toggle = (event: string, channel: string) =>
    setRouting((prev) => {
      const current = prev[event] ?? [];
      return {
        ...prev,
        [event]: current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
      };
    });

  const numberOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
  const invalid =
    (escalation.trim() !== '' && !(Number.isInteger(Number(escalation)) && Number(escalation) >= 1 && Number(escalation) <= 90)) ||
    (reminder.trim() !== '' && !(Number.isInteger(Number(reminder)) && Number(reminder) >= 1 && Number(reminder) <= 30));

  const save = async () => {
    setSaving(true);
    try {
      apply(
        await updateNotificationConfig({
          routing,
          escalationAfterDays: numberOrNull(escalation),
          reminderDaysBeforeDue: numberOrNull(reminder),
        }),
      );
      setMessage({ text: 'Notification configuration saved.' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to save.', error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Notification configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose which channels each kind of notification should use.
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Configuration only. TestSphere does not deliver email, in-app or Teams/Slack notifications yet, so saving
        this does not send anything.
      </Alert>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Notification</TableCell>
            {config.channels.map((c) => (
              <TableCell key={c.key} align="center">
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {config.events.map((e) => (
            <TableRow key={e.key}>
              <TableCell>{e.label}</TableCell>
              {config.channels.map((c) => (
                <TableCell key={c.key} align="center">
                  <Checkbox
                    size="small"
                    checked={(routing[e.key] ?? []).includes(c.key)}
                    disabled={!canManage}
                    onChange={() => toggle(e.key, c.key)}
                    slotProps={{ input: { 'aria-label': `${e.label} via ${c.label}` } }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
        <TextField
          size="small"
          label="Escalate after (days)"
          value={escalation}
          disabled={!canManage}
          onChange={(e) => setEscalation(e.target.value)}
          helperText="1-90, blank = no escalation"
        />
        <TextField
          size="small"
          label="Remind before due (days)"
          value={reminder}
          disabled={!canManage}
          onChange={(e) => setReminder(e.target.value)}
          helperText="1-30, blank = no reminder"
        />
      </Stack>
      {canManage && (
        <Button variant="contained" sx={{ mt: 2 }} disabled={saving || invalid} onClick={() => void save()}>
          Save notification configuration
        </Button>
      )}
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
