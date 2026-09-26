import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { fetchDataRetention, updateDataRetention } from '../../../api/adminConfig';
import { useAuth } from '../../../context/AuthContext';
import type { ApiDataRetention, UpdateDataRetentionPayload } from '../../../types/adminConfig';

type Field = keyof UpdateDataRetentionPayload;

const FIELDS: { key: Field; label: string; min: number; countKey: keyof ApiDataRetention['recordsPastRetention'] }[] = [
  { key: 'auditLogRetentionDays', label: 'Audit log', min: 365, countKey: 'auditLog' },
  { key: 'aiHistoryRetentionDays', label: 'AI suggestion history', min: 7, countKey: 'aiHistory' },
  { key: 'expiredSessionRetentionDays', label: 'Expired sign-in sessions', min: 7, countKey: 'expiredSessions' },
  { key: 'documentRetentionDays', label: 'Documents & evidence', min: 365, countKey: 'documents' },
];

const toText = (v: number | null) => (v === null ? '' : String(v));

export function DataRetentionTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('app_settings:manage');
  const [data, setData] = useState<ApiDataRetention | null>(null);
  const [form, setForm] = useState<Record<Field, string>>({
    auditLogRetentionDays: '',
    aiHistoryRetentionDays: '',
    expiredSessionRetentionDays: '',
    documentRetentionDays: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const apply = (d: ApiDataRetention) => {
    setData(d);
    setForm({
      auditLogRetentionDays: toText(d.auditLogRetentionDays),
      aiHistoryRetentionDays: toText(d.aiHistoryRetentionDays),
      expiredSessionRetentionDays: toText(d.expiredSessionRetentionDays),
      documentRetentionDays: toText(d.documentRetentionDays),
    });
  };

  useEffect(() => {
    fetchDataRetention()
      .then(apply)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data retention.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const invalid = FIELDS.find(({ key, min }) => {
    const v = form[key].trim();
    return v !== '' && (!/^\d+$/.test(v) || Number(v) < min || Number(v) > 3650);
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        FIELDS.map(({ key }) => [key, form[key].trim() === '' ? null : Number(form[key])]),
      ) as UpdateDataRetentionPayload;
      apply(await updateDataRetention(payload));
      setMessage({ text: 'Data-retention policy saved.' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to save.', error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Data retention
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        How long each kind of record should be kept. Leave blank to keep forever.
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Retention policy configured; automatic deletion not enabled. The policy shows how many records are past it;
        nothing is deleted.
      </Alert>
      <Stack spacing={2.5}>
        {FIELDS.map(({ key, label, min, countKey }) => (
          <Stack key={key} direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <TextField
              label={`${label} (days)`}
              size="small"
              value={form[key]}
              disabled={!canManage}
              placeholder="Keep forever"
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              helperText={`Minimum ${min} days`}
              sx={{ width: { xs: '100%', sm: 260 } }}
            />
            <Typography variant="body2" color="text.secondary">
              {data[key] === null
                ? 'Kept forever'
                : `${data.recordsPastRetention[countKey]} record(s) older than ${data[key]} days`}
            </Typography>
          </Stack>
        ))}
      </Stack>
      {invalid && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {invalid.label}: enter a whole number of days between {invalid.min} and 3650, or leave it blank.
        </Alert>
      )}
      {canManage && (
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          disabled={saving || Boolean(invalid)}
          onClick={() => void save()}
        >
          Save
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
