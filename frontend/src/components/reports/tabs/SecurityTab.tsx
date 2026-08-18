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
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchSecurityReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { SecurityReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  ACCEPTED: 'Accepted',
};
const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
};

interface SecurityTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function SecurityTab({ products, environments }: SecurityTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [viewing, setViewing] = useState<SecurityReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchSecurityReport(
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
                  exportToCsv('security-report.csv', data.rows, [
                    { header: 'Finding', value: (r) => r.title },
                    { header: 'Test', value: (r) => r.testName },
                    { header: 'Severity', value: (r) => r.severity },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Discovered At', value: (r) => r.discoveredAt },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/security-testing"
          openModuleLabel="Open in Security Testing"
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
              <SummaryCard title="Tests" value={data.summary.totalTests} icon={SecurityIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Findings" value={data.summary.totalFindings} icon={SecurityIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Open Critical/High" value={data.summary.openCriticalHighCount} icon={SecurityIcon} />
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
                  { key: 'high', label: 'High', value: data.summary.severityCounts.high, color: colorForStatusLabel('High', theme) },
                  { key: 'medium', label: 'Medium', value: data.summary.severityCounts.medium, color: colorForStatusLabel('Medium', theme) },
                  { key: 'low', label: 'Low', value: data.summary.severityCounts.low, color: colorForStatusLabel('Low', theme) },
                  { key: 'info', label: 'Info', value: data.summary.severityCounts.info, color: colorForStatusLabel('Info', theme) },
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
                  { key: 'accepted', label: 'Accepted', value: data.summary.statusCounts.accepted, color: colorForStatusLabel('Accepted', theme) },
                ]}
              />
            </Grid>
          </Grid>

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No security findings match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Finding</TableCell>
                    <TableCell>Test</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Discovered At</TableCell>
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
                      <TableCell>{row.testName}</TableCell>
                      <TableCell>
                        <StatusChip status={SEVERITY_LABELS[row.severity] ?? row.severity} />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell>{new Date(row.discoveredAt).toLocaleDateString()}</TableCell>
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
                  Showing {data.rows.length} of {data.rowsTotal} matching findings.
                </Typography>
              )}
            </TableContainer>
          )}
        </Stack>
      )}

      <ReportRecordDialog
        title={viewing ? viewing.title : null}
        subtitle={viewing?.testName}
        fields={
          viewing
            ? [
                { label: 'Severity', value: SEVERITY_LABELS[viewing.severity] ?? viewing.severity },
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Product', value: viewing.product?.name },
                { label: 'Environment', value: viewing.environment?.name },
                { label: 'Recommendation', value: viewing.recommendation },
                { label: 'Evidence', value: viewing.evidence },
                { label: 'Discovered At', value: new Date(viewing.discoveredAt).toLocaleString() },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
