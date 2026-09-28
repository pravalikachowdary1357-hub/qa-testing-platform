import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { fetchTestPlanSummaryReport } from '../../api/testPlans';
import { exportToCsvWithAudit } from '../../utils/csvExport';
import { ApiError } from '../../api/client';
import type { TestPlanSummaryReport } from '../../types/testPlan';
import { TestPlanGovernanceSummary } from './TestPlanGovernanceSummary';

const SCOPE_TEXT: Record<TestPlanSummaryReport['scopeBasis'], string> = {
  REQUIREMENTS: 'Test cases of the requirements linked to this plan',
  RELEASE: 'Test cases of the plan’s release',
  PRODUCT: 'All test cases of the product (no requirements or release linked)',
};

const pretty = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: tone }}>
        {value}
      </Typography>
    </Paper>
  );
}

// Test status / summary report for one plan -- printable (Save as PDF).
export function TestPlanSummaryReportDialog({
  testPlanId,
  onClose,
}: {
  testPlanId: string | null;
  onClose: () => void;
}) {
  const [report, setReport] = useState<TestPlanSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testPlanId) return;
    let cancelled = false;
    setReport(null);
    setError(null);
    fetchTestPlanSummaryReport(testPlanId)
      .then((data) => !cancelled && setReport(data))
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof ApiError
              ? `Failed to build the report (HTTP ${err.status}).`
              : 'Failed to build the report.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [testPlanId]);

  const plan = report?.plan;
  const completed = plan?.status === 'COMPLETED';

  const print = () => {
    const node = document.getElementById('test-plan-report');
    if (!node) return;
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    // Reuse the app's own styles so the printout looks like the dialog.
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('');
    const title = (plan?.name ?? 'Test summary report').replace(/[<>&]/g, '');
    win.document.write(
      `<!doctype html><html><head><title>${title}</title>${styles}<style>body{padding:24px;background:#fff}</style></head><body>${node.outerHTML}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadCsv = () => {
    if (!report || !plan) return;
    const rows: { metric: string; value: string | number }[] = [
      { metric: 'Test plan', value: plan.name },
      { metric: 'Product', value: plan.product.name },
      { metric: 'Owner', value: plan.owner },
      { metric: 'Status', value: pretty(plan.status) },
      { metric: 'Generated', value: report.generatedAt },
      { metric: 'Scope of figures', value: SCOPE_TEXT[report.scopeBasis] },
      { metric: 'Test completion %', value: report.execution.completionPercent },
      { metric: 'Pass rate %', value: report.execution.passRatePercent },
      { metric: 'Requirement coverage %', value: report.requirements.coveragePercent },
      { metric: 'Test cases total', value: report.execution.total },
      { metric: 'Passed', value: report.execution.pass },
      { metric: 'Failed', value: report.execution.fail },
      { metric: 'Blocked', value: report.execution.blocked },
      { metric: 'Not executed', value: report.execution.notRun },
      { metric: 'Defects total', value: report.defects.total },
      { metric: 'Defects open', value: report.defects.open },
      { metric: 'Defects reopened', value: report.defects.reopened },
      ...Object.entries(report.defects.openBySeverity).map(([sev, n]) => ({
        metric: `Open defects (${pretty(sev)})`,
        value: n,
      })),
      { metric: 'Milestones total', value: report.milestones.total },
      { metric: 'Milestones done', value: report.milestones.done },
      { metric: 'Milestones overdue', value: report.milestones.overdue },
      { metric: 'Exit (completion) criteria', value: plan.exitCriteria ?? '' },
      {
        metric: 'Approved by',
        value: plan.status !== 'DRAFT' ? (plan.reviewedBy?.name ?? '') : '',
      },
      { metric: 'Completion signed off by', value: plan.completedBy?.name ?? '' },
      { metric: 'Completion summary', value: plan.completionSummary ?? '' },
    ];
    exportToCsvWithAudit(
      'TestPlan',
      `test-summary-report-${plan.name.replace(/[^a-z0-9]+/gi, '-')}.csv`,
      rows,
      [
        { header: 'Metric', value: (r) => r.metric },
        { header: 'Value', value: (r) => r.value },
      ],
    );
  };

  return (
    <Dialog open={Boolean(testPlanId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{completed ? 'Test summary report' : 'Test status report'}</DialogTitle>
      <DialogContent dividers>
        {!report && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {report && plan && (
          <Stack id="test-plan-report" spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {plan.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {plan.product.name}
                {plan.release ? ` · ${plan.release.name} (${plan.release.version})` : ''} · Owner{' '}
                {plan.owner} · Status {pretty(plan.status)} · Generated{' '}
                {new Date(report.generatedAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scope of figures: {SCOPE_TEXT[report.scopeBasis]}
              </Typography>
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Progress
            </Typography>
            <Grid container spacing={1}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric label="Test completion" value={`${report.execution.completionPercent}%`} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric label="Pass rate" value={`${report.execution.passRatePercent}%`} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric
                  label="Requirement coverage"
                  value={report.requirements.total ? `${report.requirements.coveragePercent}%` : '—'}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric
                  label="Milestones done"
                  value={`${report.milestones.done}/${report.milestones.total}`}
                  tone={report.milestones.overdue ? '#D6364F' : undefined}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Execution ({report.execution.total} test case(s))
            </Typography>
            <Grid container spacing={1}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric label="Passed" value={report.execution.pass} tone="#1E9E62" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric label="Failed" value={report.execution.fail} tone="#D6364F" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric label="Blocked" value={report.execution.blocked} tone="#D99A00" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Metric label="Not executed" value={report.execution.notRun} />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Defects ({report.defects.open} open of {report.defects.total})
            </Typography>
            <Typography variant="body2">
              {Object.keys(report.defects.openBySeverity).length === 0
                ? 'No open defects.'
                : Object.entries(report.defects.openBySeverity)
                    .map(([sev, n]) => `${pretty(sev)}: ${n}`)
                    .join(' · ')}
            </Typography>
            {report.defects.criticalOpen.length > 0 && (
              <Alert severity="error">
                Open critical / major defects:{' '}
                {report.defects.criticalOpen
                  .slice(0, 10)
                  .map((d) => d.title)
                  .join('; ')}
                {report.defects.criticalOpen.length > 10
                  ? ` and ${report.defects.criticalOpen.length - 10} more`
                  : ''}
              </Alert>
            )}

            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Strategy, criteria and sign-off
            </Typography>
            <TestPlanGovernanceSummary plan={plan} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={!report}>
          Download CSV
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={print} disabled={!report}>
          Print / Save as PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
