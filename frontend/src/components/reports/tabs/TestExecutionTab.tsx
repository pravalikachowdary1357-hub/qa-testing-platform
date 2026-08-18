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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchTestExecutionReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { TestExecutionReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = { PENDING: 'Pending', PASS: 'Pass', FAIL: 'Fail', BLOCKED: 'Blocked' };

interface TestExecutionTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function TestExecutionTab({ products, environments }: TestExecutionTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<TestExecutionReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchTestExecutionReport(
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
                  exportToCsv('test-execution-report.csv', data.rows, [
                    { header: 'Test Case', value: (r) => r.testCaseTitle },
                    { header: 'Product', value: (r) => r.product.name },
                    { header: 'Environment', value: (r) => r.environment.name },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Executed By', value: (r) => r.executedBy },
                    { header: 'Executed At', value: (r) => r.executedAt },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/test-execution"
          openModuleLabel="Open in Test Execution"
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
              <SummaryCard title="Total Executions" value={data.summary.total} icon={VisibilityIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={VisibilityIcon} />
            </Grid>
          </Grid>

          <BreakdownBar
            segments={[
              { key: 'pass', label: 'Pass', value: data.summary.resultCounts.pass, color: colorForStatusLabel('Pass', theme) },
              { key: 'fail', label: 'Fail', value: data.summary.resultCounts.fail, color: colorForStatusLabel('Fail', theme) },
              { key: 'blocked', label: 'Blocked', value: data.summary.resultCounts.blocked, color: colorForStatusLabel('Blocked', theme) },
              { key: 'pending', label: 'Pending', value: data.summary.resultCounts.pending, color: colorForStatusLabel('In Progress', theme) },
            ]}
          />

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No test executions match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Test Case</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Executed By</TableCell>
                    <TableCell>Executed At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" noWrap>
                          {row.testCaseTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.product.name}</TableCell>
                      <TableCell>{row.environment.name}</TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell>{row.executedBy}</TableCell>
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
        title={viewing ? viewing.testCaseTitle : null}
        subtitle={viewing?.product.name}
        fields={
          viewing
            ? [
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Environment', value: viewing.environment.name },
                { label: 'Executed By', value: viewing.executedBy },
                { label: 'Executed At', value: new Date(viewing.executedAt).toLocaleString() },
                { label: 'Actual Result', value: viewing.actualResult },
                { label: 'Notes', value: viewing.notes },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
