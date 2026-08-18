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
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchAutomationReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { AutomationReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = { PASS: 'Pass', FAIL: 'Fail', BLOCKED: 'Blocked', NOT_RUN: 'Not Run' };

interface AutomationTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function AutomationTab({ products, environments }: AutomationTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<AutomationReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchAutomationReport(
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
                  exportToCsv('automation-report.csv', data.rows, [
                    { header: 'Automation', value: (r) => r.automationName },
                    { header: 'Product', value: (r) => r.product?.name },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Started At', value: (r) => r.startedAt },
                    { header: 'Recorded By', value: (r) => r.recordedBy },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/automation"
          openModuleLabel="Open in Automation"
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
              <SummaryCard title="Automations" value={data.summary.totalAutomations} icon={SmartToyIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={SmartToyIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Runs in Range" value={data.summary.totalRuns} icon={SmartToyIcon} />
            </Grid>
          </Grid>

          <BreakdownBar
            segments={[
              { key: 'pass', label: 'Pass', value: data.summary.resultCounts.pass, color: colorForStatusLabel('Pass', theme) },
              { key: 'fail', label: 'Fail', value: data.summary.resultCounts.fail, color: colorForStatusLabel('Fail', theme) },
              { key: 'blocked', label: 'Blocked', value: data.summary.resultCounts.blocked, color: colorForStatusLabel('Blocked', theme) },
              { key: 'notRun', label: 'Not Run', value: data.summary.resultCounts.notRun, color: colorForStatusLabel('Not Run', theme) },
            ]}
          />

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No automation runs match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Automation</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started At</TableCell>
                    <TableCell>Recorded By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {row.automationName}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.product?.name ?? '—'}</TableCell>
                      <TableCell>{row.environment?.name ?? '—'}</TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell>{new Date(row.startedAt).toLocaleString()}</TableCell>
                      <TableCell>{row.recordedBy}</TableCell>
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
        title={viewing ? viewing.automationName : null}
        subtitle={viewing?.product?.name}
        fields={
          viewing
            ? [
                { label: 'Type', value: viewing.type },
                { label: 'Framework', value: viewing.framework },
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Environment', value: viewing.environment?.name },
                { label: 'Started At', value: new Date(viewing.startedAt).toLocaleString() },
                { label: 'Finished At', value: viewing.finishedAt ? new Date(viewing.finishedAt).toLocaleString() : null },
                { label: 'Recorded By', value: viewing.recordedBy },
                { label: 'Notes', value: viewing.notes },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
