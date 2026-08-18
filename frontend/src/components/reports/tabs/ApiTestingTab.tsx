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
import ApiIcon from '@mui/icons-material/Api';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchApiTestingReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { ApiTestingReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = { PASSED: 'Passed', FAILED: 'Failed', NO_ASSERTION: 'No Assertion' };
const ROW_STATUS_LABEL = (passed: boolean | null) => (passed === true ? 'Passed' : passed === false ? 'Failed' : 'No Assertion');

interface ApiTestingTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function ApiTestingTab({ products, environments }: ApiTestingTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<ApiTestingReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchApiTestingReport(
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
          sx={{ width: { xs: '100%', sm: 160 } }}
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
                  exportToCsv('api-testing-report.csv', data.rows, [
                    { header: 'Request', value: (r) => r.requestName },
                    { header: 'Method', value: (r) => r.method },
                    { header: 'URL', value: (r) => r.url },
                    { header: 'Status Code', value: (r) => r.statusCode },
                    { header: 'Response Time (ms)', value: (r) => r.responseTimeMs },
                    { header: 'Result', value: (r) => ROW_STATUS_LABEL(r.passed) },
                    { header: 'Executed At', value: (r) => r.executedAt },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/api-testing"
          openModuleLabel="Open in API Testing"
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
              <SummaryCard title="Requests" value={data.summary.totalRequests} icon={ApiIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={ApiIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Avg Response Time" value={`${data.summary.avgResponseTimeMs} ms`} icon={ApiIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Executions in Range" value={data.summary.totalExecutions} icon={ApiIcon} />
            </Grid>
          </Grid>

          <BreakdownBar
            segments={[
              { key: 'passed', label: 'Passed', value: data.summary.passedCount, color: colorForStatusLabel('Pass', theme) },
              { key: 'failed', label: 'Failed', value: data.summary.failedCount, color: colorForStatusLabel('Fail', theme) },
              { key: 'noAssertion', label: 'No Assertion', value: data.summary.noAssertionCount, color: colorForStatusLabel('No Assertion', theme) },
            ]}
          />

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No API test executions match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Request</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status Code</TableCell>
                    <TableCell align="right">Response Time</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Executed At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {row.requestName}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.method}</TableCell>
                      <TableCell>{row.statusCode ?? '—'}</TableCell>
                      <TableCell align="right">{row.responseTimeMs !== null ? `${row.responseTimeMs} ms` : '—'}</TableCell>
                      <TableCell>
                        <StatusChip status={ROW_STATUS_LABEL(row.passed)} />
                      </TableCell>
                      <TableCell>{new Date(row.executedAt).toLocaleString()}</TableCell>
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
                  Showing {data.rows.length} of {data.rowsTotal} matching executions.
                </Typography>
              )}
            </TableContainer>
          )}
        </Stack>
      )}

      <ReportRecordDialog
        title={viewing ? viewing.requestName : null}
        subtitle={viewing?.product?.name}
        fields={
          viewing
            ? [
                { label: 'Method', value: viewing.method },
                { label: 'URL', value: viewing.url },
                { label: 'Environment', value: viewing.environment?.name },
                { label: 'Status Code', value: viewing.statusCode },
                { label: 'Response Time', value: viewing.responseTimeMs !== null ? `${viewing.responseTimeMs} ms` : null },
                { label: 'Result', value: ROW_STATUS_LABEL(viewing.passed) },
                { label: 'Error Message', value: viewing.errorMessage },
                { label: 'Executed At', value: new Date(viewing.executedAt).toLocaleString() },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
