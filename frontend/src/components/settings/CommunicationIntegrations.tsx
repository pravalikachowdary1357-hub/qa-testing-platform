import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import {
  createWebhook,
  deleteWebhook,
  fetchEmailStatus,
  fetchWebhooks,
  testEmail,
  testWebhook,
  updateWebhook,
} from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';
import type { ApiEmailStatus, ApiWebhook, WebhookProvider } from '../../types/adminConfig';

const EVENTS: { key: string; label: string }[] = [
  { key: 'ASSIGNMENT', label: 'Assignments' },
  { key: 'DEFECT', label: 'Defects' },
  { key: 'TEST_CYCLE_REMINDER', label: 'Test cycle reminders' },
  { key: 'APPROVAL_REMINDER', label: 'Approval reminders' },
  { key: 'ESCALATION', label: 'Escalations' },
  { key: 'OVERDUE_ALERT', label: 'Overdue alerts' },
  { key: 'RELEASE_READINESS', label: 'Release readiness changes' },
];
const PROVIDER_LABEL: Record<WebhookProvider, string> = { TEAMS: 'Microsoft Teams', SLACK: 'Slack' };

function StatusChip({ status }: { status: 'OK' | 'FAILED' | null }) {
  if (status === 'OK') return <Chip size="small" color="success" label="Connected" />;
  if (status === 'FAILED') return <Chip size="small" color="error" label="Last delivery failed" />;
  return <Chip size="small" label="Not tested yet" />;
}

interface FormState {
  id?: string;
  provider: WebhookProvider;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  provider: 'TEAMS',
  name: '',
  url: '',
  events: EVENTS.map((e) => e.key),
  enabled: true,
};

// Teams / Slack webhooks and email: real delivery. "Connected" is shown only
// after a message was actually delivered. Webhook URLs are secrets: they
// are written once and never shown again (only a short hint).
export function CommunicationIntegrations({ onChanged }: { onChanged: () => void }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('integrations:manage');
  const [webhooks, setWebhooks] = useState<ApiWebhook[] | null>(null);
  const [email, setEmail] = useState<ApiEmailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = () => {
    Promise.all([fetchWebhooks(), fetchEmailStatus()])
      .then(([w, e]) => {
        setWebhooks(w);
        setEmail(e);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load integrations.'));
  };
  useEffect(load, []);

  const afterChange = () => {
    load();
    onChanged();
  };

  const save = async () => {
    if (!form) return;
    setFormError(null);
    setBusy('form');
    try {
      if (form.id) {
        await updateWebhook(form.id, {
          name: form.name,
          events: form.events,
          enabled: form.enabled,
          ...(form.url.trim() ? { url: form.url.trim() } : {}),
        });
      } else {
        await createWebhook({
          provider: form.provider,
          name: form.name,
          url: form.url.trim(),
          events: form.events,
          enabled: form.enabled,
        });
      }
      setForm(null);
      setMessage({ text: 'Webhook saved. Send a test message to confirm it works.' });
      afterChange();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save webhook.');
    } finally {
      setBusy(null);
    }
  };

  const runTest = async (w: ApiWebhook) => {
    setBusy(w.id);
    try {
      const r = await testWebhook(w.id);
      setMessage(
        r.delivered
          ? { text: `Test message delivered to "${w.name}".` }
          : { text: `Test message to "${w.name}" failed: ${r.error}`, error: true },
      );
      afterChange();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Test failed.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (w: ApiWebhook) => {
    setBusy(w.id);
    try {
      await deleteWebhook(w.id);
      setMessage({ text: `Webhook "${w.name}" removed.` });
      afterChange();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to remove webhook.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const runEmailTest = async () => {
    setBusy('email');
    try {
      const r = await testEmail();
      setMessage(
        r.delivered ? { text: `Test email sent to ${r.to}.` } : { text: `Test email failed: ${r.error}`, error: true },
      );
      afterChange();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Test email failed.', error: true });
    } finally {
      setBusy(null);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!webhooks || !email) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Teams / Slack webhooks</Typography>
            <Typography variant="body2" color="text.secondary">
              Paste an incoming-webhook URL from a Teams channel (Workflows) or Slack. The URL is stored encrypted and
              never shown again.
            </Typography>
          </Box>
          {canManage && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError(null);
                setForm({ ...EMPTY_FORM });
              }}
            >
              Add webhook
            </Button>
          )}
        </Stack>
        {webhooks.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No webhooks yet.
          </Typography>
        )}
        <Stack spacing={1}>
          {webhooks.map((w) => (
            <Paper key={w.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{w.name}</Typography>
                    <Chip size="small" variant="outlined" label={PROVIDER_LABEL[w.provider]} />
                    {w.enabled ? <StatusChip status={w.lastStatus} /> : <Chip size="small" label="Disabled" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {w.urlHint} · {w.events.length} event type(s)
                    {w.lastDeliveredAt ? ` · last attempt ${new Date(w.lastDeliveredAt).toLocaleString()}` : ''}
                  </Typography>
                  {w.lastStatus === 'FAILED' && w.lastError && (
                    <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                      {w.lastError}
                    </Typography>
                  )}
                </Box>
                {canManage && (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Button
                      size="small"
                      aria-label={`Send test to ${w.name}`}
                      startIcon={busy === w.id ? <CircularProgress size={14} /> : <SendIcon />}
                      disabled={busy !== null}
                      onClick={() => void runTest(w)}
                    >
                      Send test
                    </Button>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        aria-label={`Edit ${w.name}`}
                        onClick={() => {
                          setFormError(null);
                          setForm({ id: w.id, provider: w.provider, name: w.name, url: '', events: w.events, enabled: w.enabled });
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" aria-label={`Remove ${w.name}`} disabled={busy !== null} onClick={() => void remove(w)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 600 }}>Email delivery</Typography>
              {!email.configured ? (
                <Chip size="small" label="Not configured" color="warning" />
              ) : (
                <StatusChip status={email.last?.lastStatus ?? null} />
              )}
            </Stack>
            {email.configured ? (
              <Typography variant="body2" color="text.secondary">
                Sending from {email.from} via {email.host}. Users receive emails only if they allow email notifications
                in their profile.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Set these backend environment variables to enable email: {email.requiredVariables.join(', ')}.
              </Typography>
            )}
            {email.last?.lastStatus === 'FAILED' && email.last.lastError && (
              <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                {email.last.lastError}
              </Typography>
            )}
          </Box>
          {canManage && email.configured && (
            <Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={busy === 'email' ? <CircularProgress size={14} /> : <SendIcon />}
                disabled={busy !== null}
                onClick={() => void runEmailTest()}
              >
                Send test email to me
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      <Dialog open={Boolean(form)} onClose={() => setForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{form?.id ? 'Edit webhook' : 'Add webhook'}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                select
                label="Service"
                value={form.provider}
                disabled={Boolean(form.id)}
                onChange={(e) => setForm({ ...form, provider: e.target.value as WebhookProvider })}
              >
                <MenuItem value="TEAMS">Microsoft Teams</MenuItem>
                <MenuItem value="SLACK">Slack</MenuItem>
              </TextField>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. QA channel"
                required
              />
              <TextField
                label={form.id ? 'New webhook URL (leave blank to keep the current one)' : 'Webhook URL'}
                value={form.url}
                type="password"
                autoComplete="off"
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required={!form.id}
                helperText={
                  form.provider === 'SLACK'
                    ? 'https://hooks.slack.com/services/…'
                    : 'Teams Workflows webhook (…logic.azure.com / …powerplatform.com) or an incoming webhook (…webhook.office.com)'
                }
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Send these notifications
                </Typography>
                {EVENTS.map((ev) => (
                  <FormControlLabel
                    key={ev.key}
                    control={
                      <Checkbox
                        size="small"
                        checked={form.events.includes(ev.key)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            events: e.target.checked ? [...form.events, ev.key] : form.events.filter((k) => k !== ev.key),
                          })
                        }
                      />
                    }
                    label={ev.label}
                  />
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  An event is only posted here if Teams / Slack is also ticked for it under Application Settings &gt;
                  Notification configuration.
                </Typography>
              </Box>
              <FormControlLabel
                control={<Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />}
                label="Enabled"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForm(null)} disabled={busy === 'form'}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy === 'form' || !form?.name.trim() || (!form?.id && !form?.url.trim())}
            onClick={() => void save()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={5000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message ? (
          <Alert severity={message.error ? 'error' : 'success'} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
