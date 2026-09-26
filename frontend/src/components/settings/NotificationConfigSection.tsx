import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { fetchNotificationConfig, updateNotificationConfig } from '../../api/adminConfig';
import { runScheduledNotifications } from '../../api/notifications';
import { fetchRoles } from '../../api/roles';
import { useAuth } from '../../context/AuthContext';
import type { ApiNotificationConfig } from '../../types/adminConfig';
import type { ApiRole } from '../../types/settings';

// Notification configuration (Requirements section 24): which channels each
// event is delivered to, who receives it, and the reminder / escalation
// timing. Delivery is real; a channel that cannot deliver yet (email
// without SMTP, Teams/Slack without a webhook) is shown as unavailable.
export function NotificationConfigSection() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('app_settings:manage');
  const [config, setConfig] = useState<ApiNotificationConfig | null>(null);
  const [routing, setRouting] = useState<Record<string, string[]>>({});
  const [recipients, setRecipients] = useState<Record<string, string[]>>({});
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [running, setRunning] = useState(false);
  const [escalation, setEscalation] = useState('');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const apply = (c: ApiNotificationConfig) => {
    setConfig(c);
    setRouting(c.routing);
    setRecipients(c.recipientRoleIds ?? {});
    setEscalation(c.escalationAfterDays === null ? '' : String(c.escalationAfterDays));
    setReminder(c.reminderDaysBeforeDue === null ? '' : String(c.reminderDaysBeforeDue));
  };

  useEffect(() => {
    fetchNotificationConfig()
      .then(apply)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notification configuration.'));
    fetchRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
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
          recipientRoleIds: recipients,
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

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await runScheduledNotifications();
      setMessage({
        text: `Reminders run: ${r.approvalReminders} approval reminder(s), ${r.escalations} escalation(s), ${r.dueSoon} due-soon, ${r.overdue} overdue.`,
      });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to run reminders.', error: true });
    } finally {
      setRunning(false);
    }
  };

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Notification configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose which channels each kind of notification uses and who receives it. Leave recipients empty to use the
        default recipients.
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {config.channels.map((c) => (
          <Tooltip key={c.key} title={c.detail}>
            <Chip
              size="small"
              label={`${c.label}: ${c.available ? 'ready' : 'not set up'}`}
              color={c.available ? 'success' : 'default'}
              variant={c.available ? 'filled' : 'outlined'}
            />
          </Tooltip>
        ))}
      </Stack>
      {config.channels.some((c) => !c.available) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {config.channels
            .filter((c) => !c.available)
            .map((c) => `${c.label}: ${c.detail}`)
            .join(' ')}{' '}
          Notifications routed to a channel that is not set up are simply not sent there.
        </Alert>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Notification</TableCell>
            {config.channels.map((c) => (
              <TableCell key={c.key} align="center">
                {c.label}
              </TableCell>
            ))}
            <TableCell sx={{ minWidth: 240 }}>Recipients</TableCell>
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
              <TableCell>
                {e.key === 'ASSIGNMENT' ? (
                  <Typography variant="body2" color="text.secondary">
                    {e.defaultRecipients}
                  </Typography>
                ) : (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    disabled={!canManage}
                    value={recipients[e.key] ?? []}
                    helperText={(recipients[e.key] ?? []).length === 0 ? `Default: ${e.defaultRecipients}` : undefined}
                    slotProps={{
                      select: {
                        multiple: true,
                        displayEmpty: true,
                        renderValue: (value) => {
                          const ids = value as string[];
                          return ids.length === 0 ? <em>Default recipients</em> : ids.map(roleName).join(', ');
                        },
                      },
                      htmlInput: { 'aria-label': `${e.label} recipients` },
                    }}
                    onChange={(ev) => {
                      const value = ev.target.value as unknown as string[] | string;
                      setRecipients((prev) => ({
                        ...prev,
                        [e.key]: typeof value === 'string' ? value.split(',') : value,
                      }));
                    }}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        <Checkbox size="small" checked={(recipients[e.key] ?? []).includes(role.id)} />
                        {role.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </TableCell>
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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {config.dailyScheduleEnabled
          ? 'Reminders, escalations and overdue alerts are checked automatically once a day.'
          : 'The automatic daily check is off until CRON_SECRET is set in the backend environment. Use "Run reminders now" meanwhile.'}
      </Typography>
      {canManage && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" disabled={saving || invalid} onClick={() => void save()}>
            Save notification configuration
          </Button>
          <Button variant="outlined" disabled={running} onClick={() => void runNow()}>
            {running ? <CircularProgress size={20} /> : 'Run reminders now'}
          </Button>
        </Stack>
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
