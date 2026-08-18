import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AiBadge } from '../AiBadge';
import { StatusChip } from '../../common/StatusChip';
import { SourceContextCard } from '../SourceContextCard';
import { applySeverity, suggestDefectSeverity, summarizeDefect, updateSuggestionStatus } from '../../../api/ai';
import { fetchDefects } from '../../../api/defects';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiDefect } from '../../../types/defect';
import type { SuggestDefectSeverityResult, SummarizeDefectResult } from '../../../types/ai';

const SEVERITY_LABELS: Record<string, string> = { CRITICAL: 'Critical', MAJOR: 'Major', MINOR: 'Minor', TRIVIAL: 'Trivial' };
const PRIORITY_LABELS: Record<string, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

export function DefectAssistantTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [defects, setDefects] = useState<ApiDefect[]>([]);
  const [defectId, setDefectId] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSeverity, setLoadingSeverity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummarizeDefectResult | null>(null);
  const [severity, setSeverity] = useState<SuggestDefectSeverityResult | null>(null);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [summaryAck, setSummaryAck] = useState<string | null>(null);

  useEffect(() => {
    fetchDefects(currentProduct?.id)
      .then(setDefects)
      .catch(() => {});
  }, [currentProduct?.id]);

  const reset = () => {
    setSummary(null);
    setSeverity(null);
    setApplyMessage(null);
    setSummaryAck(null);
    setError(null);
  };

  const handleSummarize = async () => {
    setLoadingSummary(true);
    setError(null);
    setSummary(null);
    setSummaryAck(null);
    try {
      setSummary(await summarizeDefect(defectId));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSuggestSeverity = async () => {
    setLoadingSeverity(true);
    setError(null);
    setSeverity(null);
    setApplyMessage(null);
    try {
      setSeverity(await suggestDefectSeverity(defectId));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoadingSeverity(false);
    }
  };

  const handleApplySeverity = async () => {
    if (!severity) return;
    try {
      await applySeverity(severity.suggestionId, {
        severity: severity.suggestedSeverity ?? undefined,
        priority: severity.suggestedPriority ?? undefined,
        edited: false,
      });
      setApplyMessage('Applied to the real defect record.');
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  };

  const handleAckSummary = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!summary) return;
    await updateSuggestionStatus(summary.suggestionId, status).catch((err) => setError(aiErrorMessage(err)));
    setSummaryAck(status === 'ACCEPTED' ? 'Kept.' : 'Dismissed.');
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a defect to get an AI-generated summary and a severity/priority suggestion. Applying a
        suggestion updates the real defect record only after you explicitly click Apply.
      </Typography>
      <TextField
        select
        size="small"
        label="Defect"
        value={defectId}
        onChange={(e) => {
          setDefectId(e.target.value);
          reset();
        }}
        sx={{ minWidth: 320, mb: 2 }}
      >
        <MenuItem value="">Select a defect…</MenuItem>
        {defects.map((d) => (
          <MenuItem key={d.id} value={d.id}>
            {d.title}
          </MenuItem>
        ))}
      </TextField>

      {!aiConfigured && <Alert severity="info" sx={{ mb: 2 }}>Configure an AI provider to use this feature.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={loadingSummary ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          disabled={!defectId || loadingSummary || !aiConfigured}
          onClick={handleSummarize}
        >
          Summarize
        </Button>
        <Button
          variant="outlined"
          startIcon={loadingSeverity ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          disabled={!defectId || loadingSeverity || !aiConfigured}
          onClick={handleSuggestSeverity}
        >
          Suggest Severity / Priority
        </Button>
      </Stack>

      {summary && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <AiBadge />
            <Typography variant="subtitle2">Summary</Typography>
          </Stack>
          <SourceContextCard context={summary.sourceContext} />
          <Typography variant="body2" sx={{ my: 1.5 }}>{summary.summary}</Typography>
          {summaryAck ? (
            <Alert severity="success">{summaryAck}</Alert>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button size="small" onClick={() => handleAckSummary('ACCEPTED')}>Keep</Button>
              <Button size="small" onClick={() => handleAckSummary('REJECTED')}>Dismiss</Button>
            </Stack>
          )}
        </Paper>
      )}

      {severity && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <AiBadge />
            <Typography variant="subtitle2">Severity / Priority Suggestion</Typography>
          </Stack>
          <SourceContextCard context={severity.sourceContext} />
          <Stack direction="row" spacing={4} sx={{ my: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Current</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <StatusChip status={SEVERITY_LABELS[severity.currentSeverity] ?? severity.currentSeverity} />
                <StatusChip status={PRIORITY_LABELS[severity.currentPriority] ?? severity.currentPriority} />
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">AI Suggested</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {severity.suggestedSeverity && (
                  <StatusChip status={SEVERITY_LABELS[severity.suggestedSeverity] ?? severity.suggestedSeverity} />
                )}
                {severity.suggestedPriority && (
                  <StatusChip status={PRIORITY_LABELS[severity.suggestedPriority] ?? severity.suggestedPriority} />
                )}
              </Stack>
            </Box>
          </Stack>
          {severity.reasoning && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {severity.reasoning}
            </Typography>
          )}
          {applyMessage ? (
            <Alert severity="success">{applyMessage}</Alert>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="success" size="small" onClick={handleApplySeverity}>
                Apply to Defect
              </Button>
              <Button size="small" onClick={() => setSeverity(null)}>
                Dismiss
              </Button>
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}
