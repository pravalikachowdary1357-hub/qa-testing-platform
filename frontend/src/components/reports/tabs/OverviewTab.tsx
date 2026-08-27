import { Alert, Box, CircularProgress, Grid, MenuItem, Stack, TextField, Typography, useTheme } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BugReportIcon from '@mui/icons-material/BugReport';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { useReportData } from '../../../hooks/useReportData';
import { fetchOverviewReport } from '../../../api/reports';
import { exportToCsvWithAudit } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';

interface OverviewTabProps {
  products: ApiProduct[];
}

export function OverviewTab({ products }: OverviewTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchOverviewReport({
        productId: productId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [productId, dateFrom, dateTo],
  );

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
        <TextField
          size="small"
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 170 } }}
        />
        <TextField
          size="small"
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 170 } }}
        />
      </Stack>

      <Box sx={{ mb: 2 }}>
        <ReportToolbar
          onRefresh={refresh}
          onExport={
            data
              ? () =>
                  exportToCsvWithAudit(
                    'Report:Overview',
                    'overview-report.csv',
                    [
                      { category: 'Overview', metric: 'Products', value: data.productCount },
                      { category: 'Requirement Coverage', metric: 'Coverage %', value: data.requirementCoverage.requirementCoveragePercent },
                      { category: 'Requirement Coverage', metric: 'Covered Requirements', value: data.requirementCoverage.coveredRequirements },
                      { category: 'Requirement Coverage', metric: 'Total Requirements', value: data.requirementCoverage.totalRequirements },
                      { category: 'Test Execution', metric: 'Test Coverage %', value: data.testExecution.testCoveragePercent },
                      { category: 'Test Execution', metric: 'Pass Rate %', value: data.testExecution.passRatePercent },
                      { category: 'Test Execution', metric: 'Total Test Cases', value: data.testExecution.totalTestCases },
                      { category: 'Test Execution', metric: 'Executed Test Cases', value: data.testExecution.executedTestCases },
                      { category: 'Test Execution', metric: 'Pass', value: data.testExecution.resultCounts.pass },
                      { category: 'Test Execution', metric: 'Fail', value: data.testExecution.resultCounts.fail },
                      { category: 'Test Execution', metric: 'Blocked', value: data.testExecution.resultCounts.blocked },
                      { category: 'Test Execution', metric: 'Pending', value: data.testExecution.resultCounts.pending },
                      { category: 'Test Execution', metric: 'Not Run', value: data.testExecution.resultCounts.notRun },
                      { category: 'Defects', metric: 'Total Defects', value: data.defects.total },
                      { category: 'Defects', metric: 'Open Defects', value: data.defects.openCount },
                      { category: 'Defects', metric: 'Critical Open Defects', value: data.defects.criticalOpenCount },
                      ...(data.automation
                        ? [
                            { category: 'Automation', metric: 'Total', value: data.automation.total },
                            { category: 'Automation', metric: 'Pass Rate %', value: data.automation.passRatePercent },
                          ]
                        : []),
                      ...(data.apiTesting
                        ? [
                            { category: 'API Testing', metric: 'Total', value: data.apiTesting.total },
                            { category: 'API Testing', metric: 'Pass Rate %', value: data.apiTesting.passRatePercent },
                          ]
                        : []),
                      ...(data.performance
                        ? [
                            { category: 'Performance', metric: 'Total', value: data.performance.total },
                            { category: 'Performance', metric: 'Pass Rate %', value: data.performance.passRatePercent },
                          ]
                        : []),
                      ...(data.security
                        ? [
                            { category: 'Security', metric: 'Total Findings', value: data.security.totalFindings },
                            { category: 'Security', metric: 'Open Critical/High', value: data.security.openCriticalHighCount },
                          ]
                        : []),
                      ...(data.uat
                        ? [
                            { category: 'UAT', metric: 'Total Cycles', value: data.uat.totalCycles },
                            { category: 'UAT', metric: 'Approved', value: data.uat.approved },
                            { category: 'UAT', metric: 'Rejected', value: data.uat.rejected },
                          ]
                        : []),
                      ...(data.releaseQuality
                        ? [
                            { category: 'Release Quality', metric: 'Total', value: data.releaseQuality.total },
                            { category: 'Release Quality', metric: 'Ready', value: data.releaseQuality.ready },
                            { category: 'Release Quality', metric: 'Not Ready', value: data.releaseQuality.notReady },
                          ]
                        : []),
                    ],
                    [
                      { header: 'Category', value: (r) => r.category },
                      { header: 'Metric', value: (r) => r.metric },
                      { header: 'Value', value: (r) => r.value },
                    ],
                  )
              : undefined
          }
          exportDisabled={!data}
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Products" value={data.productCount} icon={Inventory2Icon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard
                title="Requirement Coverage"
                value={`${data.requirementCoverage.requirementCoveragePercent}%`}
                icon={AssignmentIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Test Coverage" value={`${data.testExecution.testCoveragePercent}%`} icon={FactCheckIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.testExecution.passRatePercent}%`} icon={TaskAltIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Open Defects" value={data.defects.openCount} icon={BugReportIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Critical Open Defects" value={data.defects.criticalOpenCount} icon={ReportProblemIcon} />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Test Execution Results
            </Typography>
            <BreakdownBar
              segments={[
                { key: 'pass', label: 'Pass', value: data.testExecution.resultCounts.pass, color: colorForStatusLabel('Pass', theme) },
                { key: 'fail', label: 'Fail', value: data.testExecution.resultCounts.fail, color: colorForStatusLabel('Fail', theme) },
                { key: 'blocked', label: 'Blocked', value: data.testExecution.resultCounts.blocked, color: colorForStatusLabel('Blocked', theme) },
                { key: 'pending', label: 'Pending', value: data.testExecution.resultCounts.pending, color: colorForStatusLabel('In Progress', theme) },
                { key: 'notRun', label: 'Not Run', value: data.testExecution.resultCounts.notRun, color: colorForStatusLabel('Not Run', theme) },
              ]}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Automation
              </Typography>
              {data.automation ? (
                <Typography variant="body2">
                  {data.automation.total} automated · {data.automation.passRatePercent}% pass rate
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No automation data available yet.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                API Testing
              </Typography>
              {data.apiTesting ? (
                <Typography variant="body2">
                  {data.apiTesting.total} executions · {data.apiTesting.passRatePercent}% pass rate
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No API testing data available yet.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Performance
              </Typography>
              {data.performance ? (
                <Typography variant="body2">
                  {data.performance.total} tests · {data.performance.passRatePercent}% pass rate
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No performance testing data available yet.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Security
              </Typography>
              {data.security ? (
                <Typography variant="body2">
                  {data.security.totalFindings} findings · {data.security.openCriticalHighCount} open critical/high
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No security testing data available yet.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                UAT
              </Typography>
              {data.uat ? (
                <Typography variant="body2">
                  {data.uat.totalCycles} cycles · {data.uat.approved} approved · {data.uat.rejected} rejected
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No UAT data available yet.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Release Quality
              </Typography>
              {data.releaseQuality ? (
                <Typography variant="body2">
                  {data.releaseQuality.total} releases · {data.releaseQuality.ready} ready · {data.releaseQuality.notReady} not ready
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No release data available yet.
                </Typography>
              )}
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
