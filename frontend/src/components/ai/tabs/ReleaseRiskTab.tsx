import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, List, ListItem, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { AiBadge } from '../AiBadge';
import { StatusChip } from '../../common/StatusChip';
import { explainReleaseRisks } from '../../../api/ai';
import { fetchReleases } from '../../../api/release';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiRelease } from '../../../types/release';
import type { ExplainReleaseRisksResult } from '../../../types/ai';

const READINESS_LABELS: Record<string, string> = { READY: 'Ready', CONDITIONAL: 'Conditionally Ready', NOT_READY: 'Not Ready' };

export function ReleaseRiskTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [releases, setReleases] = useState<ApiRelease[]>([]);
  const [releaseId, setReleaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainReleaseRisksResult | null>(null);

  useEffect(() => {
    fetchReleases(currentProduct?.id)
      .then(setReleases)
      .catch(() => {});
  }, [currentProduct?.id]);

  const handleExplain = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await explainReleaseRisks(releaseId));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Readiness and quality gates below are always the real, live-computed results from the Release
        Quality module -- the AI only explains and prioritizes what's already there, it never changes the
        release's actual readiness.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Release"
          value={releaseId}
          onChange={(e) => setReleaseId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">Select a release…</MenuItem>
          {releases.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name} ({r.version})
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!releaseId || loading || !aiConfigured}
          onClick={handleExplain}
        >
          Explain Risks
        </Button>
      </Stack>

      {releases.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No releases exist yet.</Alert>}
      {!aiConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configure an AI provider for the narrative explanation. The full Release Quality report is always
          available on the <strong>Release Quality</strong> page regardless.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2">Readiness:</Typography>
            <StatusChip status={READINESS_LABELS[result.readiness] ?? result.readiness} />
          </Stack>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Quality Gates</Typography>
            {result.gates.map((gate) => {
              const Icon = gate.passed ? CheckCircleIcon : gate.impact === 'BLOCKING' ? CancelIcon : WarningAmberIcon;
              const color = gate.passed ? 'success.main' : gate.impact === 'BLOCKING' ? 'error.main' : 'warning.main';
              return (
                <Stack direction="row" spacing={1.5} key={gate.key} sx={{ alignItems: 'flex-start', py: 0.5 }}>
                  <Icon sx={{ color, mt: 0.25 }} fontSize="small" />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{gate.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{gate.detail}</Typography>
                  </Box>
                </Stack>
              );
            })}
          </Paper>

          {(result.narrative || result.prioritizedActions.length > 0) && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <AiBadge />
                <Typography variant="subtitle2">AI Narrative</Typography>
              </Stack>
              {result.narrative && <Typography variant="body2" sx={{ mb: 1.5 }}>{result.narrative}</Typography>}
              {result.prioritizedActions.length > 0 && (
                <List dense>
                  {result.prioritizedActions.map((action, i) => (
                    <ListItem key={i} sx={{ py: 0 }}>
                      <ListItemText primary={`${i + 1}. ${action}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
}
