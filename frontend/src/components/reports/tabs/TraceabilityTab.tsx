import { Alert, Box, CircularProgress, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { ReportToolbar } from '../ReportToolbar';
import { useReportData } from '../../../hooks/useReportData';
import { fetchTraceabilityReport } from '../../../api/reports';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';

interface TraceabilityTabProps {
  products: ApiProduct[];
}

export function TraceabilityTab({ products }: TraceabilityTabProps) {
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');

  const { data, error, loading, refresh } = useReportData(
    () => fetchTraceabilityReport({ productId: productId || undefined }),
    [productId],
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
      </Stack>

      <Box sx={{ mb: 2 }}>
        <ReportToolbar onRefresh={refresh} openModulePath="/traceability" openModuleLabel="Open Full Traceability Matrix" />
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
              <SummaryCard title="Requirement Coverage" value={`${data.summary.requirementCoveragePercent}%`} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Test Case Coverage" value={`${data.summary.testCaseCoveragePercent}%`} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${data.summary.passRatePercent}%`} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Unlinked Scenarios" value={data.summary.unlinkedTestScenarioCount} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Orphan Test Cases" value={data.summary.orphanTestCaseCount} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Failed w/o Defect" value={data.summary.failedWithoutDefectCount} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Defects w/o Linkage" value={data.summary.defectsWithoutLinkageCount} icon={TimelineIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Total Defects" value={data.summary.totalDefects} icon={TimelineIcon} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Orphan Test Cases (never executed)
              </Typography>
              {data.gaps.orphanTestCases.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  None -- every test case has at least one execution.
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={0.75}>
                    {data.gaps.orphanTestCases.map((gap) => (
                      <Typography key={gap.id} variant="body2">
                        {gap.title} <Typography component="span" variant="caption" color="text.secondary">({gap.product?.name})</Typography>
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Failing Tests Without a Defect
              </Typography>
              {data.gaps.failedWithoutDefects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  None -- every currently-failing test has a linked defect.
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={0.75}>
                    {data.gaps.failedWithoutDefects.map((gap) => (
                      <Typography key={gap.id} variant="body2">
                        {gap.testCaseTitle} <Typography component="span" variant="caption" color="text.secondary">({gap.product?.name})</Typography>
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
