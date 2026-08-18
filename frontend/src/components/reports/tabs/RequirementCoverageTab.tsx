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
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchRequirementCoverageReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { RequirementCoverageReportRow } from '../../../types/reports';

const COVERAGE_STATUS_LABELS: Record<string, string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
  IN_PROGRESS: 'In Progress',
  NOT_EXECUTED: 'Not Executed',
  NOT_COVERED: 'Not Covered',
};

interface RequirementCoverageTabProps {
  products: ApiProduct[];
}

export function RequirementCoverageTab({ products }: RequirementCoverageTabProps) {
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [viewing, setViewing] = useState<RequirementCoverageReportRow | null>(null);

  const { data, error, loading, refresh } = useReportData(
    () => fetchRequirementCoverageReport({ productId: productId || undefined }),
    [productId],
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
          sx={{ width: { xs: '100%', sm: 200 } }}
        >
          <MenuItem value="">All Products</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
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
                  exportToCsv('requirement-coverage-report.csv', data.rows, [
                    { header: 'Requirement', value: (r) => r.title },
                    { header: 'Product', value: (r) => r.product.name },
                    { header: 'Test Scenarios', value: (r) => r.testScenarioCount },
                    { header: 'Test Cases', value: (r) => r.testCaseCount },
                    { header: 'Coverage %', value: (r) => r.coveragePercent },
                    { header: 'Status', value: (r) => r.coverageStatus },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/requirements"
          openModuleLabel="Open in Requirements"
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
              <SummaryCard title="Requirements" value={data.summary.totalRequirements} icon={AssignmentIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard
                title="Requirement Coverage"
                value={`${data.summary.requirementCoveragePercent}%`}
                icon={AssignmentIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Fully Passed" value={data.summary.fullyPassed} icon={AssignmentIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Not Covered" value={data.summary.notCovered} icon={AssignmentIcon} />
            </Grid>
          </Grid>

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No requirements match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Requirement</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Scenarios</TableCell>
                    <TableCell align="right">Test Cases</TableCell>
                    <TableCell align="right">Coverage</TableCell>
                    <TableCell>Status</TableCell>
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
                      <TableCell align="right">{row.testScenarioCount}</TableCell>
                      <TableCell align="right">{row.testCaseCount}</TableCell>
                      <TableCell align="right">{row.coveragePercent}%</TableCell>
                      <TableCell>
                        <StatusChip status={COVERAGE_STATUS_LABELS[row.coverageStatus] ?? row.coverageStatus} />
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
                { label: 'Priority', value: viewing.priority },
                { label: 'Status', value: viewing.status },
                { label: 'Test Scenarios', value: viewing.testScenarioCount },
                { label: 'Test Cases', value: viewing.testCaseCount },
                { label: 'Executed', value: viewing.executedCount },
                { label: 'Coverage', value: `${viewing.coveragePercent}%` },
                {
                  label: 'Result Breakdown',
                  value: `Pass ${viewing.resultCounts.pass} · Fail ${viewing.resultCounts.fail} · Blocked ${viewing.resultCounts.blocked} · Not Run ${viewing.resultCounts.notRun}`,
                },
                { label: 'Coverage Status', value: COVERAGE_STATUS_LABELS[viewing.coverageStatus] ?? viewing.coverageStatus },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
