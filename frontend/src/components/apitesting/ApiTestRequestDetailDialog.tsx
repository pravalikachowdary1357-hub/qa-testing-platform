import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { executeApiTestRequest, fetchApiTestRequest } from '../../api/apiTesting';
import { ApiError } from '../../api/client';
import type { ApiTestExecution, ApiTestRequest } from '../../types/apiTesting';

const MASK = '••••••••••••';

const AUTH_TYPE_LABELS: Record<string, string> = {
  NONE: 'None',
  BEARER: 'Bearer',
  BASIC: 'Basic',
  API_KEY: 'API Key',
};

function resultLabel(execution: { passed: boolean | null } | null): string {
  if (!execution) return '—';
  if (execution.passed === true) return 'Pass';
  if (execution.passed === false) return 'Fail';
  return 'No Assertion';
}

function KeyValueList({ record }: { record: Record<string, string> | null }) {
  const entries = record ? Object.entries(record) : [];
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        None
      </Typography>
    );
  }
  return (
    <Stack spacing={0.25}>
      {entries.map(([key, value]) => (
        <Typography key={key} variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {key}: {value}
        </Typography>
      ))}
    </Stack>
  );
}

interface ApiTestRequestDetailDialogProps {
  apiTestRequestId: string | null;
  onClose: () => void;
}

export function ApiTestRequestDetailDialog({
  apiTestRequestId,
  onClose,
}: ApiTestRequestDetailDialogProps) {
  const [request, setRequest] = useState<ApiTestRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ApiTestExecution | null>(null);

  useEffect(() => {
    if (!apiTestRequestId) {
      setRequest(null);
      setError(null);
      setRevealed(false);
      setSending(false);
      setSendError(null);
      setLastResult(null);
      return;
    }

    let cancelled = false;
    setRequest(null);
    setError(null);
    setRevealed(false);
    setSending(false);
    setSendError(null);
    setLastResult(null);

    fetchApiTestRequest(apiTestRequestId)
      .then((data) => {
        if (!cancelled) setRequest(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load API test request (HTTP ${err.status}).`
            : 'Failed to load API test request. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [apiTestRequestId]);

  const handleSendRequest = async () => {
    if (!apiTestRequestId) return;

    setSending(true);
    setSendError(null);

    try {
      const execution = await executeApiTestRequest(apiTestRequestId);
      setLastResult(execution);
      // Refetch so the Request History table below reflects the new run.
      const refreshed = await fetchApiTestRequest(apiTestRequestId);
      setRequest(refreshed);
    } catch (err: unknown) {
      setSendError(
        err instanceof ApiError
          ? `Failed to send request (HTTP ${err.status}).`
          : 'Failed to send request. Is the backend running?',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(apiTestRequestId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>API Test Request Details</DialogTitle>
      <DialogContent>
        {!request && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {request && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{request.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {request.product.name}
                {request.environment ? ` · ${request.environment.name}` : ''}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Request
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                <strong>{request.method}</strong> {request.url}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Auth Type
                </Typography>
                <Typography variant="body2">{AUTH_TYPE_LABELS[request.authType]}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Expected Status
                </Typography>
                <Typography variant="body2">{request.expectedStatus ?? 'Not set'}</Typography>
              </Box>
            </Stack>

            {request.authType !== 'NONE' && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Auth Config
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setRevealed((prev) => !prev)}
                    aria-label={revealed ? 'Hide auth config' : 'Show auth config'}
                  >
                    {revealed ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
                {revealed ? (
                  <KeyValueList record={request.authConfig} />
                ) : (
                  <Typography variant="body2">{MASK}</Typography>
                )}
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Headers
              </Typography>
              <KeyValueList record={request.headers} />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Query Params
              </Typography>
              <KeyValueList record={request.queryParams} />
            </Box>

            {request.body && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Body
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {request.body}
                </Typography>
              </Box>
            )}

            <Box>
              <Button
                variant="contained"
                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={handleSendRequest}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Send Request'}
              </Button>
            </Box>

            {sendError && <Alert severity="error">{sendError}</Alert>}

            {lastResult && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Result
                </Typography>
                <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', mb: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status Code
                    </Typography>
                    <Typography variant="body2">{lastResult.statusCode ?? '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Response Time
                    </Typography>
                    <Typography variant="body2">
                      {lastResult.responseTimeMs != null ? `${lastResult.responseTimeMs} ms` : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Assertion
                    </Typography>
                    <Typography variant="body2">{resultLabel(lastResult)}</Typography>
                  </Box>
                </Stack>

                {lastResult.errorMessage && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {lastResult.errorMessage}
                  </Alert>
                )}

                {lastResult.responseHeaders && Object.keys(lastResult.responseHeaders).length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Response Headers
                    </Typography>
                    <KeyValueList record={lastResult.responseHeaders} />
                  </Box>
                )}

                {lastResult.responseBody != null && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Response Body
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        maxHeight: 240,
                        overflow: 'auto',
                        p: 1,
                        m: 0,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      {lastResult.responseBody}
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">{new Date(request.createdAt).toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">{new Date(request.updatedAt).toLocaleString()}</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Request History
              </Typography>
              {request.executions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No executions recorded yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Executed At</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>Response Time</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {request.executions.map((execution) => (
                        <TableRow key={execution.id}>
                          <TableCell>{new Date(execution.executedAt).toLocaleString()}</TableCell>
                          <TableCell>{execution.statusCode ?? '—'}</TableCell>
                          <TableCell>{resultLabel(execution)}</TableCell>
                          <TableCell>
                            {execution.responseTimeMs != null ? `${execution.responseTimeMs} ms` : '—'}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography variant="body2" noWrap>
                              {execution.errorMessage ?? '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
