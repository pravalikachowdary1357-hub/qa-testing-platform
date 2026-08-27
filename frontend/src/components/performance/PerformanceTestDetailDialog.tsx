import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { StatusChip } from '../common/StatusChip';
import { ProductDetailDialog } from '../product/ProductDetailDialog';
import { MetricTrendChart } from './MetricTrendChart';
import { fetchPerformanceTest, runPerformanceTest, stopPerformanceTest } from '../../api/performanceTesting';
import { ApiError } from '../../api/client';
import { RUN_STATUS_LABELS } from '../../types/performanceTesting';
import type { PerformanceTest, PerformanceTestRun } from '../../types/performanceTesting';

const POLL_INTERVAL_MS = 1500;
const MAX_TREND_POINTS = 20;

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}
function formatRps(value: number): string {
  return `${value.toFixed(1)} req/s`;
}
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function durationLabel(run: PerformanceTestRun): string {
  if (!run.finishedAt) return '—';
  const seconds = (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000;
  return `${seconds.toFixed(1)}s`;
}

function thresholdsLabel(run: PerformanceTestRun): string {
  if (run.thresholdsPassed === null) return 'None set';
  return run.thresholdsPassed ? 'Met' : 'Not met';
}

interface PerformanceTestDetailDialogProps {
  performanceTestId: string | null;
  onClose: () => void;
}

export function PerformanceTestDetailDialog({
  performanceTestId,
  onClose,
}: PerformanceTestDetailDialogProps) {
  const [test, setTest] = useState<PerformanceTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  useEffect(() => {
    if (!performanceTestId) {
      setTest(null);
      setError(null);
      setRunning(false);
      setRunError(null);
      setStopping(false);
      setStopError(null);
      return;
    }

    let cancelled = false;
    setTest(null);
    setError(null);
    setRunError(null);
    setStopError(null);

    fetchPerformanceTest(performanceTestId)
      .then((data) => {
        if (!cancelled) setTest(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load performance test (HTTP ${err.status}).`
            : 'Failed to load performance test. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [performanceTestId]);

  const isLive = running || test?.lastRunStatus === 'QUEUED' || test?.lastRunStatus === 'RUNNING';

  // While a run is QUEUED/RUNNING, poll so this dialog reflects genuine
  // server-side progress -- including a run started from another tab, or
  // one still in flight after this dialog was reopened.
  useEffect(() => {
    if (!performanceTestId || !isLive) return;

    const interval = setInterval(() => {
      fetchPerformanceTest(performanceTestId)
        .then((data) => setTest(data))
        .catch(() => {
          // Transient poll failure -- keep showing the last known state.
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [performanceTestId, isLive]);

  const handleRun = async () => {
    if (!performanceTestId) return;
    setRunError(null);
    setRunning(true);

    try {
      await runPerformanceTest(performanceTestId);
    } catch (err: unknown) {
      setRunError(
        err instanceof ApiError
          ? `Failed to run performance test (HTTP ${err.status}): ${err.message}`
          : 'Failed to run performance test. Is the backend running?',
      );
    } finally {
      setRunning(false);
      try {
        const refreshed = await fetchPerformanceTest(performanceTestId);
        setTest(refreshed);
      } catch {
        // Keep the last known state if the final refresh fails.
      }
    }
  };

  const handleStop = async () => {
    if (!performanceTestId) return;
    setStopError(null);
    setStopping(true);

    try {
      await stopPerformanceTest(performanceTestId);
    } catch (err: unknown) {
      setStopError(
        err instanceof ApiError
          ? `Failed to stop performance test (HTTP ${err.status}): ${err.message}`
          : 'Failed to stop performance test. Is the backend running?',
      );
    } finally {
      setStopping(false);
    }
  };

  const finishedRuns = test ? test.runs.filter((run) => run.finishedAt !== null) : [];
  const trendRuns = [...finishedRuns].slice(0, MAX_TREND_POINTS).reverse();
  const responseTimePoints = trendRuns
    .filter((run) => run.avgResponseTimeMs != null)
    .map((run) => ({ timestamp: run.startedAt, value: run.avgResponseTimeMs as number }));
  const throughputPoints = trendRuns
    .filter((run) => run.throughputRps != null)
    .map((run) => ({ timestamp: run.startedAt, value: run.throughputRps as number }));
  const errorRatePoints = trendRuns
    .filter((run) => run.errorRatePercent != null)
    .map((run) => ({ timestamp: run.startedAt, value: run.errorRatePercent as number }));

  return (
    <Dialog open={Boolean(performanceTestId)} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Performance Test Details</DialogTitle>
      <DialogContent>
        {!test && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {test && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{test.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                  onClick={() => setViewingProductId(test.productId)}
                >
                  {test.product.name}
                </Link>
                {test.environment ? ` · ${test.environment.name}` : ''}
              </Typography>
              {test.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {test.description}
                </Typography>
              )}
            </Box>

            {test.release && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Release
                </Typography>
                <Typography variant="body2">
                  {test.release.name} ({test.release.version})
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Target
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                <strong>{test.method}</strong> {test.targetUrl}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Virtual Users
                </Typography>
                <Typography variant="body2">{test.virtualUsers}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ramp-Up
                </Typography>
                <Typography variant="body2">{test.rampUpSeconds}s</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body2">{test.durationSeconds}s</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Iterations Cap
                </Typography>
                <Typography variant="body2">{test.iterations ?? 'None'}</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Response Time Threshold
                </Typography>
                <Typography variant="body2">
                  {test.thresholdResponseTimeMs != null ? `${test.thresholdResponseTimeMs} ms` : 'None'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Error Rate Threshold
                </Typography>
                <Typography variant="body2">
                  {test.thresholdErrorRatePercent != null ? `${test.thresholdErrorRatePercent}%` : 'None'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Throughput Threshold
                </Typography>
                <Typography variant="body2">
                  {test.thresholdThroughputRps != null ? `${test.thresholdThroughputRps} req/s` : 'None'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Current Status
              </Typography>
              {test.lastRunStatus ? (
                <StatusChip status={RUN_STATUS_LABELS[test.lastRunStatus]} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Never run
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleRun}
                disabled={isLive}
              >
                {running ? 'Running…' : 'Run Test'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStop}
                disabled={!isLive || stopping}
              >
                {stopping ? 'Stopping…' : 'Stop'}
              </Button>
            </Stack>

            {isLive && (
              <Alert severity="info">
                Sending real HTTP requests to the target for up to {test.durationSeconds}s. This box
                updates automatically while the run is in progress.
              </Alert>
            )}
            {runError && <Alert severity="error">{runError}</Alert>}
            {stopError && <Alert severity="error">{stopError}</Alert>}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Metrics
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
                <MetricTrendChart
                  title="Avg Response Time"
                  color="#2a78d6"
                  points={responseTimePoints}
                  formatValue={formatMs}
                />
                <MetricTrendChart
                  title="Throughput"
                  color="#1baf7a"
                  points={throughputPoints}
                  formatValue={formatRps}
                />
                <MetricTrendChart
                  title="Error Rate"
                  color="#e34948"
                  points={errorRatePoints}
                  formatValue={formatPercent}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Run History
              </Typography>
              {test.runs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No runs recorded yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Started At</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Requests</TableCell>
                        <TableCell>Failed</TableCell>
                        <TableCell>Avg RT</TableCell>
                        <TableCell>Throughput</TableCell>
                        <TableCell>Error Rate</TableCell>
                        <TableCell>Thresholds</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {test.runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <StatusChip status={RUN_STATUS_LABELS[run.status]} />
                          </TableCell>
                          <TableCell>{durationLabel(run)}</TableCell>
                          <TableCell>{run.totalRequests ?? '—'}</TableCell>
                          <TableCell>{run.failedRequests ?? '—'}</TableCell>
                          <TableCell>
                            {run.avgResponseTimeMs != null ? formatMs(run.avgResponseTimeMs) : '—'}
                          </TableCell>
                          <TableCell>
                            {run.throughputRps != null ? formatRps(run.throughputRps) : '—'}
                          </TableCell>
                          <TableCell>
                            {run.errorRatePercent != null ? formatPercent(run.errorRatePercent) : '—'}
                          </TableCell>
                          <TableCell>{thresholdsLabel(run)}</TableCell>
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

      <ProductDetailDialog productId={viewingProductId} onClose={() => setViewingProductId(null)} />
    </Dialog>
  );
}
