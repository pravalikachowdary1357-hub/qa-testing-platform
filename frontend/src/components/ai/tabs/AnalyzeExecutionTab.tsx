import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, List, ListItem, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { AiBadge } from '../AiBadge';
import { SourceContextCard } from '../SourceContextCard';
import { analyzeExecution } from '../../../api/ai';
import { updateSuggestionStatus } from '../../../api/ai';
import { fetchTestExecutions } from '../../../api/testExecutions';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiTestExecution } from '../../../types/testExecution';
import type { AnalyzeExecutionResult } from '../../../types/ai';

export function AnalyzeExecutionTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [executions, setExecutions] = useState<ApiTestExecution[]>([]);
  const [testExecutionId, setTestExecutionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeExecutionResult | null>(null);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);

  useEffect(() => {
    fetchTestExecutions(currentProduct?.id)
      .then((data) => setExecutions(data.filter((e) => e.status === 'FAIL' || e.status === 'BLOCKED')))
      .catch(() => {});
  }, [currentProduct?.id]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAcknowledged(null);
    try {
      const res = await analyzeExecution(testExecutionId);
      setResult(res);
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (status: 'ACCEPTED' | 'REJECTED') => {
    if (!result) return;
    try {
      await updateSuggestionStatus(result.suggestionId, status);
      setAcknowledged(status === 'ACCEPTED' ? 'Marked as useful.' : 'Dismissed.');
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a failed or blocked test execution to get an AI-suggested root-cause hypothesis. This is a
        read-only suggestion for a human to investigate -- it never changes the execution record itself.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Failed / Blocked Execution"
          value={testExecutionId}
          onChange={(e) => setTestExecutionId(e.target.value)}
          sx={{ minWidth: 320 }}
        >
          <MenuItem value="">Select an execution…</MenuItem>
          {executions.map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {e.testCase.title} — {e.status} ({new Date(e.executedAt).toLocaleDateString()})
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!testExecutionId || loading || !aiConfigured}
          onClick={handleAnalyze}
        >
          Analyze
        </Button>
      </Stack>

      {executions.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No failed or blocked test executions exist yet.
        </Alert>
      )}
      {!aiConfigured && <Alert severity="info" sx={{ mb: 2 }}>Configure an AI provider to use this feature.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {acknowledged && <Alert severity="success" sx={{ mb: 2 }}>{acknowledged}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AiBadge />
            <Typography variant="subtitle2">Failure analysis</Typography>
          </Stack>
          <SourceContextCard context={result.sourceContext} />
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{result.analysis}</Typography>
            {result.likelyRootCause && (
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                <strong>Likely root cause:</strong> {result.likelyRootCause}
              </Typography>
            )}
            {result.suggestedNextSteps.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">Suggested next steps</Typography>
                <List dense>
                  {result.suggestedNextSteps.map((step, i) => (
                    <ListItem key={i} sx={{ py: 0 }}>
                      <ListItemText primary={`• ${step}`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Paper>
          <Stack direction="row" spacing={2}>
            <Button startIcon={<ThumbUpIcon />} onClick={() => handleAcknowledge('ACCEPTED')} disabled={!!acknowledged}>
              Useful
            </Button>
            <Button startIcon={<ThumbDownIcon />} onClick={() => handleAcknowledge('REJECTED')} disabled={!!acknowledged}>
              Not useful
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
