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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchTestCaseStatusReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { TestCaseStatusReportRow } from '../../../types/reports';

const LIFECYCLE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  APPROVED: 'Approved',
  DEPRECATED: 'Deprecated',
};
const RESULT_LABELS: Record<string, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
  PENDING: 'Pending',
  NOT_RUN: 'Not Run',
};

interface TestCaseStatusTabProps {
  products: ApiProduct[];
}

export function TestCaseStatusTab({ products }: TestCaseStatusTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [lifecycleStatus, setLifecycleStatus] = useState('');
  const [resultStatus, setResultStatus] = useState('');
  const [viewing, setViewing] = useState<TestCaseStatusReportRow | null>(null);

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchTestCaseStatusReport(
        { productId: productId || undefined },
        lifecycleStatus || undefined,
        resultStatus || undefined,
      ),
    [productId, lifecycleStatus, resultStatus],
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
          select
          size="small"
          label="Lifecycle Status"
          value={lifecycleStatus}
          onChange={(e) => setLifecycleStatus(e.target.value)}
          sx={{ width: { xs: '100%', sm: 170 } }}
        >
          <MenuItem value="">All</MenuItem>
          {Object.entries(LIFECYCLE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Latest Result"
          value={resultStatus}
          onChange={(e) => setResultStatus(e.target.value)}
          sx={{ width: { xs: '100%', sm: 160 } }}
        >
          <MenuItem value="">All</MenuItem>
          {Object.entries(RESULT_LABELS).map(([value, label]) => (
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
                  exportToCsv('test-case-status-report.csv', data.rows, [
                    { header: 'Test Case', value: (r) => r.title },
                    { header: 'Product', value: (r) => r.product.name },
                    { header: 'Priority', value: (r) => r.priority },
                    { header: 'Lifecycle Status', value: (r) => r.lifecycleStatus },
                    { header: 'Latest Result', value: (r) => r.latestResultStatus },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/test-cases"
          openModuleLabel="Open in Test Cases"
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
              <SummaryCard title="Test Cases" value={data.summary.total} icon={FactCheckIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Test Coverage" value={`${data.summary.testCoveragePercent}%`} icon={FactCheckIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={FactCheckIcon} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                By Lifecycle Status
              </Typography>
              <BreakdownBar
                segments={[
                  { key: 'draft', label: 'Draft', value: data.summary.lifecycleCounts.draft, color: colorForStatusLabel('Draft', theme) },
                  { key: 'ready', label: 'Ready', value: data.summary.lifecycleCounts.ready, color: colorForStatusLabel('Ready', theme) },
                  { key: 'approved', label: 'Approved', value: data.summary.lifecycleCounts.approved, color: colorForStatusLabel('Approved', theme) },
                  { key: 'deprecated', label: 'Deprecated', value: data.summary.lifecycleCounts.deprecated, color: colorForStatusLabel('Deprecated', theme) },
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                By Latest Result
              </Typography>
              <BreakdownBar
                segments={[
                  { key: 'pass', label: 'Pass', value: data.summary.resultCounts.pass, color: colorForStatusLabel('Pass', theme) },
                  { key: 'fail', label: 'Fail', value: data.summary.resultCounts.fail, color: colorForStatusLabel('Fail', theme) },
                  { key: 'blocked', label: 'Blocked', value: data.summary.resultCounts.blocked, color: colorForStatusLabel('Blocked', theme) },
                  { key: 'pending', label: 'Pending', value: data.summary.resultCounts.pending, color: colorForStatusLabel('In Progress', theme) },
                  { key: 'notRun', label: 'Not Run', value: data.summary.resultCounts.notRun, color: colorForStatusLabel('Not Run', theme) },
                ]}
              />
            </Grid>
          </Grid>

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No test cases match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Test Case</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Lifecycle Status</TableCell>
                    <TableCell>Latest Result</TableCell>
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
                      <TableCell>{row.priority}</TableCell>
                      <TableCell>
                        <StatusChip status={LIFECYCLE_LABELS[row.lifecycleStatus] ?? row.lifecycleStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={RESULT_LABELS[row.latestResultStatus] ?? row.latestResultStatus} />
                      </TableCell>
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
                { label: 'Test Scenario', value: viewing.testScenario.title },
                { label: 'Priority', value: viewing.priority },
                { label: 'Lifecycle Status', value: LIFECYCLE_LABELS[viewing.lifecycleStatus] ?? viewing.lifecycleStatus },
                { label: 'Latest Result', value: RESULT_LABELS[viewing.latestResultStatus] ?? viewing.latestResultStatus },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
