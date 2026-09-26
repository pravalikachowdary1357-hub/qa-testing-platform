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
import BugReportIcon from '@mui/icons-material/BugReport';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchDefectReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { DefectReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
};
const SEVERITY_LABELS: Record<string, string> = { CRITICAL: 'Critical', MAJOR: 'Major', MINOR: 'Minor', TRIVIAL: 'Trivial' };

interface DefectsTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function DefectsTab({ products, environments }: DefectsTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [viewing, setViewing] = useState<DefectReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchDefectReport(
        {
          productId: productId || undefined,
          environmentId: environmentId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        status || undefined,
        severity || undefined,
      ),
    [productId, environmentId, dateFrom, dateTo, status, severity],
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
          sx={{ width: { xs: '100%', sm: 170 } }}
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
          sx={{ width: { xs: '100%', sm: 170 } }}
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
          sx={{ width: { xs: '100%', sm: 150 } }}
        />
        <TextField
          size="small"
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 150 } }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ width: { xs: '100%', sm: 140 } }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          sx={{ width: { xs: '100%', sm: 140 } }}
        >
          <MenuItem value="">All Severities</MenuItem>
          {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
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
                  exportToCsv('defect-report.csv', data.rows, [
                    { header: 'Title', value: (r) => r.title },
                    { header: 'Product', value: (r) => r.product.name },
                    { header: 'Severity', value: (r) => r.severity },
                    { header: 'Priority', value: (r) => r.priority },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Assigned To', value: (r) => r.assignedTo },
                    { header: 'Created At', value: (r) => r.createdAt },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/defects"
          openModuleLabel="Open in Defects"
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
              <SummaryCard title="Total Defects" value={data.summary.total} icon={BugReportIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Open" value={data.summary.openCount} icon={BugReportIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Critical Open" value={data.summary.criticalOpenCount} icon={BugReportIcon} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                By Severity
              </Typography>
              <BreakdownBar
                segments={[
                  { key: 'critical', label: 'Critical', value: data.summary.severityCounts.critical, color: colorForStatusLabel('Critical', theme) },
                  { key: 'major', label: 'Major', value: data.summary.severityCounts.major, color: colorForStatusLabel('Major', theme) },
                  { key: 'minor', label: 'Minor', value: data.summary.severityCounts.minor, color: colorForStatusLabel('Minor', theme) },
                  { key: 'trivial', label: 'Trivial', value: data.summary.severityCounts.trivial, color: colorForStatusLabel('Trivial', theme) },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                By Status
              </Typography>
              <BreakdownBar
                segments={[
                  { key: 'open', label: 'Open', value: data.summary.statusCounts.open, color: colorForStatusLabel('Open', theme) },
                  { key: 'inProgress', label: 'In Progress', value: data.summary.statusCounts.inProgress, color: colorForStatusLabel('In Progress', theme) },
                  { key: 'resolved', label: 'Resolved', value: data.summary.statusCounts.resolved, color: colorForStatusLabel('Resolved', theme) },
                  { key: 'reopened', label: 'Reopened', value: data.summary.statusCounts.reopened, color: colorForStatusLabel('Reopened', theme) },
                  { key: 'closed', label: 'Closed', value: data.summary.statusCounts.closed, color: colorForStatusLabel('Closed', theme) },
                  { key: 'deferred', label: 'Deferred', value: data.summary.statusCounts.deferred ?? 0, color: colorForStatusLabel('Deferred', theme) },
                ]}
              />
            </Grid>
          </Grid>

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No defects match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" noWrap>
                          {row.title}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.product.name}</TableCell>
                      <TableCell>
                        <StatusChip status={SEVERITY_LABELS[row.severity] ?? row.severity} />
                      </TableCell>
                      <TableCell>{row.priority}</TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell>{row.assignedTo ?? '—'}</TableCell>
                      <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
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
            </TableContainer>
          )}
        </Stack>
      )}

      <ReportRecordDialog
        title={viewing ? viewing.title : null}
        subtitle={viewing?.product.name}
        fields={
          viewing
            ? [
                { label: 'Severity', value: SEVERITY_LABELS[viewing.severity] ?? viewing.severity },
                { label: 'Priority', value: viewing.priority },
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Environment', value: viewing.environment?.name },
                { label: 'Test Case', value: viewing.testCase?.title },
                { label: 'Assigned To', value: viewing.assignedTo },
                { label: 'Created At', value: new Date(viewing.createdAt).toLocaleString() },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
