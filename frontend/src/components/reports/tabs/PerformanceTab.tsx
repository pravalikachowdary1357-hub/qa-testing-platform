import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchPerformanceReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { PerformanceReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  PASSED: 'Passed',
  FAILED: 'Failed',
  STOPPED: 'Stopped',
};

interface PerformanceTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function PerformanceTab({ products, environments }: PerformanceTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<PerformanceReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchPerformanceReport(
        {
          productId: productId || undefined,
          environmentId: environmentId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        status || undefined,
      ),
    [productId, environmentId, dateFrom, dateTo, status],
  );

  const isEmpty = data && data.rows.length === 0;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Product"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setEnvironmentId('');
          }}
          sx={{ width: { xs: '100%', sm: 180 } }}
        >
          <MenuItem value="">All Products</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Environment"
          value={environmentId}
          onChange={(e) => setEnvironmentId(e.target.value)}
          sx={{ width: { xs: '100%', sm: 180 } }}
        >
          <MenuItem value="">All Environments</MenuItem>
          {filteredEnvironments.map((env) => (
            <MenuItem key={env.id} value={env.id}>
              {env.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <TextField
          size="small"
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ width: { xs: '100%', sm: 150 } }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <ReportToolbar
          onRefresh={refresh}
          onExport={
            data
              ? () =>
                  exportToCsv('performance-report.csv', data.rows, [
                    { header: 'Test', value: (r) => r.testName },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Avg Response Time (ms)', value: (r) => r.avgResponseTimeMs },
                    { header: 'P95 Response Time (ms)', value: (r) => r.p95ResponseTimeMs },
                    { header: 'Throughput (rps)', value: (r) => r.throughputRps },
                    { header: 'Error Rate (%)', value: (r) => r.errorRatePercent },
                    { header: 'Started At', value: (r) => r.startedAt },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/performance-testing"
          openModuleLabel="Open in Performance Testing"
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Tests" value={data.summary.totalTests} icon={SpeedIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={SpeedIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Runs in Range" value={data.summary.totalRuns} icon={SpeedIcon} />
            </Grid>
          </Grid>

          <BreakdownBar
            segments={[
              { key: 'passed', label: 'Passed', value: data.summary.resultCounts.passed, color: colorForStatusLabel('Passed', theme) },
              { key: 'failed', label: 'Failed', value: data.summary.resultCounts.failed, color: colorForStatusLabel('Failed', theme) },
              { key: 'running', label: 'Running', value: data.summary.resultCounts.running, color: colorForStatusLabel('Running', theme) },
              { key: 'queued', label: 'Queued', value: data.summary.resultCounts.queued, color: colorForStatusLabel('Queued', theme) },
              { key: 'stopped', label: 'Stopped', value: data.summary.resultCounts.stopped, color: colorForStatusLabel('Stopped', theme) },
              { key: 'neverRun', label: 'Never Run', value: data.summary.resultCounts.neverRun, color: colorForStatusLabel('Not Run', theme) },
            ]}
          />

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No performance test runs match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Test</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Avg RT</TableCell>
                    <TableCell align="right">P95 RT</TableCell>
                    <TableCell align="right">Throughput</TableCell>
                    <TableCell align="right">Error Rate</TableCell>
                    <TableCell>Started At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {row.testName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell align="right">{row.avgResponseTimeMs !== null ? `${Math.round(row.avgResponseTimeMs)} ms` : '—'}</TableCell>
                      <TableCell align="right">{row.p95ResponseTimeMs !== null ? `${Math.round(row.p95ResponseTimeMs)} ms` : '—'}</TableCell>
                      <TableCell align="right">{row.throughputRps !== null ? row.throughputRps.toFixed(1) : '—'}</TableCell>
                      <TableCell align="right">{row.errorRatePercent !== null ? `${row.errorRatePercent}%` : '—'}</TableCell>
                      <TableCell>{new Date(row.startedAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => setViewing(row)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.rowsTruncated && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 1 }}>
                  Showing {data.rows.length} of {data.rowsTotal} matching runs.
                </Typography>
              )}
            </TableContainer>
          )}
        </Stack>
      )}

      <ReportRecordDialog
        title={viewing ? viewing.testName : null}
        subtitle={viewing?.product?.name}
        fields={
          viewing
            ? [
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Environment', value: viewing.environment?.name },
                { label: 'Avg Response Time', value: viewing.avgResponseTimeMs !== null ? `${Math.round(viewing.avgResponseTimeMs)} ms` : null },
                { label: 'P95 Response Time', value: viewing.p95ResponseTimeMs !== null ? `${Math.round(viewing.p95ResponseTimeMs)} ms` : null },
                { label: 'Throughput', value: viewing.throughputRps !== null ? `${viewing.throughputRps.toFixed(1)} rps` : null },
                { label: 'Error Rate', value: viewing.errorRatePercent !== null ? `${viewing.errorRatePercent}%` : null },
                { label: 'Thresholds Passed', value: viewing.thresholdsPassed === null ? null : viewing.thresholdsPassed ? 'Yes' : 'No' },
                { label: 'Error Message', value: viewing.errorMessage },
                { label: 'Started At', value: new Date(viewing.startedAt).toLocaleString() },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
