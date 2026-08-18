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
import HowToRegIcon from '@mui/icons-material/HowToReg';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchUatReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { UatReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

interface UatTabProps {
  products: ApiProduct[];
}

export function UatTab({ products }: UatTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<UatReportRow | null>(null);

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchUatReport(
        {
          productId: productId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        status || undefined,
      ),
    [productId, dateFrom, dateTo, status],
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
          onChange={(e) => setProductId(e.target.value)}
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
                  exportToCsv('uat-report.csv', data.rows, [
                    { header: 'Cycle', value: (r) => r.name },
                    { header: 'Product', value: (r) => r.product.name },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Test Cases', value: (r) => r.testCaseCount },
                    { header: 'Signed Off By', value: (r) => r.signOffBy },
                    { header: 'Created At', value: (r) => r.createdAt },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/uat"
          openModuleLabel="Open in UAT"
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
              <SummaryCard title="Cycles" value={data.summary.totalCycles} icon={HowToRegIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Approved" value={data.summary.statusCounts.approved} icon={HowToRegIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Rejected" value={data.summary.statusCounts.rejected} icon={HowToRegIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={HowToRegIcon} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                By Cycle Status
              </Typography>
              <BreakdownBar
                segments={[
                  { key: 'planned', label: 'Planned', value: data.summary.statusCounts.planned, color: colorForStatusLabel('Planned', theme) },
                  { key: 'inProgress', label: 'In Progress', value: data.summary.statusCounts.inProgress, color: colorForStatusLabel('In Progress', theme) },
                  { key: 'completed', label: 'Completed', value: data.summary.statusCounts.completed, color: colorForStatusLabel('Completed', theme) },
                  { key: 'approved', label: 'Approved', value: data.summary.statusCounts.approved, color: colorForStatusLabel('Approved', theme) },
                  { key: 'rejected', label: 'Rejected', value: data.summary.statusCounts.rejected, color: colorForStatusLabel('Rejected', theme) },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                UAT Test Case Results
              </Typography>
              <BreakdownBar
                segments={[
                  { key: 'pass', label: 'Pass', value: data.summary.resultCounts.pass, color: colorForStatusLabel('Pass', theme) },
                  { key: 'fail', label: 'Fail', value: data.summary.resultCounts.fail, color: colorForStatusLabel('Fail', theme) },
                  { key: 'blocked', label: 'Blocked', value: data.summary.resultCounts.blocked, color: colorForStatusLabel('Blocked', theme) },
                  { key: 'notApplicable', label: 'Not Applicable', value: data.summary.resultCounts.notApplicable, color: colorForStatusLabel('Not Applicable', theme) },
                  { key: 'notRun', label: 'Not Run', value: data.summary.resultCounts.notRun, color: colorForStatusLabel('Not Run', theme) },
                ]}
              />
            </Grid>
          </Grid>

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No UAT cycles match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cycle</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Test Cases</TableCell>
                    <TableCell>Signed Off By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {row.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.product.name}</TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell align="right">{row.testCaseCount}</TableCell>
                      <TableCell>{row.signOffBy ?? '—'}</TableCell>
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
        title={viewing ? viewing.name : null}
        subtitle={viewing?.product.name}
        fields={
          viewing
            ? [
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Test Cases', value: viewing.testCaseCount },
                { label: 'Signed Off By', value: viewing.signOffBy },
                { label: 'Signed Off At', value: viewing.signOffAt ? new Date(viewing.signOffAt).toLocaleString() : null },
                { label: 'Created At', value: new Date(viewing.createdAt).toLocaleString() },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
