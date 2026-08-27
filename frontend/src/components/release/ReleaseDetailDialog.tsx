import { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { StatusChip } from '../common/StatusChip';
import { ProductDetailDialog } from '../product/ProductDetailDialog';
import { READINESS_LABELS, RELEASE_STATUS_LABELS } from '../../types/release';
import type { ApiRelease, QualityGateResult } from '../../types/release';

const READINESS_ALERT_SEVERITY: Record<ApiRelease['quality']['readiness'], 'success' | 'warning' | 'error'> = {
  READY: 'success',
  CONDITIONAL: 'warning',
  NOT_READY: 'error',
};

const READINESS_EXPLANATION: Record<ApiRelease['quality']['readiness'], string> = {
  READY: 'All blocking and warning quality gates pass. This release meets the bar for release.',
  CONDITIONAL: 'All blocking gates pass, but one or more warning conditions do not. Review before proceeding.',
  NOT_READY: 'One or more blocking quality gates fail. This release should not proceed.',
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 92, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

function GateRow({ gate }: { gate: QualityGateResult }) {
  const Icon = gate.passed ? CheckCircleIcon : gate.impact === 'BLOCKING' ? CancelIcon : WarningAmberIcon;
  const color = gate.passed ? 'success.main' : gate.impact === 'BLOCKING' ? 'error.main' : 'warning.main';

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', py: 0.75 }}>
      <Icon sx={{ color, mt: 0.25 }} fontSize="small" />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {gate.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {gate.detail}
        </Typography>
      </Box>
    </Stack>
  );
}

function NotAvailable({ label }: { label: string }) {
  return (
    <Typography variant="body2" color="text.secondary">
      No {label} data available for this product yet.
    </Typography>
  );
}

interface ReleaseDetailDialogProps {
  release: ApiRelease | null;
  onClose: () => void;
}

export function ReleaseDetailDialog({ release, onClose }: ReleaseDetailDialogProps) {
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);

  return (
    <Dialog open={Boolean(release)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Release Quality Details</DialogTitle>
      <DialogContent>
        {release && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">
                {release.name} <Typography component="span" color="text.secondary">({release.version})</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                  onClick={() => setViewingProductId(release.productId)}
                >
                  {release.product.name}
                </Link>
                {release.environment ? ` · ${release.environment.name}` : ''}
                {release.releaseDate ? ` · Release date ${new Date(release.releaseDate).toLocaleDateString()}` : ''}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={RELEASE_STATUS_LABELS[release.status]} />
              <StatusChip status={READINESS_LABELS[release.quality.readiness]} />
            </Stack>

            {release.notes && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {release.notes}
              </Typography>
            )}

            {release.signOffBy && (
              <Alert severity={release.status === 'REJECTED' ? 'error' : 'success'}>
                Signed off by {release.signOffBy}
                {release.signOffAt ? ` on ${new Date(release.signOffAt).toLocaleString()}` : ''}
                {release.signOffNotes ? ` — ${release.signOffNotes}` : ''}
              </Alert>
            )}

            <Alert severity={READINESS_ALERT_SEVERITY[release.quality.readiness]}>
              <strong>{READINESS_LABELS[release.quality.readiness]}</strong> — {READINESS_EXPLANATION[release.quality.readiness]}
            </Alert>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Blocking Conditions
              </Typography>
              <Stack divider={<Divider />}>
                {release.quality.gates
                  .filter((gate) => gate.impact === 'BLOCKING')
                  .map((gate) => (
                    <GateRow key={gate.key} gate={gate} />
                  ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Warning Conditions
              </Typography>
              <Stack divider={<Divider />}>
                {release.quality.gates
                  .filter((gate) => gate.impact === 'WARNING')
                  .map((gate) => (
                    <GateRow key={gate.key} gate={gate} />
                  ))}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Test Execution Summary
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                <StatTile label="Test Cases" value={release.quality.testExecutionSummary.totalTestCases} />
                <StatTile
                  label="Coverage"
                  value={`${release.quality.testExecutionSummary.testCoveragePercent}%`}
                />
                <StatTile label="Pass Rate" value={`${release.quality.testExecutionSummary.passRatePercent}%`} />
                <StatTile label="Pass" value={release.quality.testExecutionSummary.resultCounts.pass} />
                <StatTile label="Fail" value={release.quality.testExecutionSummary.resultCounts.fail} />
                <StatTile label="Blocked" value={release.quality.testExecutionSummary.resultCounts.blocked} />
                <StatTile label="Pending" value={release.quality.testExecutionSummary.resultCounts.pending} />
                <StatTile label="Not Run" value={release.quality.testExecutionSummary.resultCounts.notRun} />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Requirement Coverage
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                <StatTile label="Requirements" value={release.quality.requirementCoverage.totalRequirements} />
                <StatTile label="Covered" value={release.quality.requirementCoverage.coveredRequirements} />
                <StatTile
                  label="Coverage"
                  value={`${release.quality.requirementCoverage.requirementCoveragePercent}%`}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Defects
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                <StatTile label="Open" value={release.quality.defects.openCount} />
                <StatTile label="Critical Open" value={release.quality.defects.criticalOpenCount} />
                <StatTile label="Critical/Major Open" value={release.quality.defects.criticalMajorOpenCount} />
                <StatTile label="Resolved" value={release.quality.defects.statusCounts.resolved} />
                <StatTile label="Closed" value={release.quality.defects.statusCounts.closed} />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Automation
              </Typography>
              {release.quality.automation ? (
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  <StatTile label="Total" value={release.quality.automation.total} />
                  <StatTile label="Pass" value={release.quality.automation.pass} />
                  <StatTile label="Fail" value={release.quality.automation.fail} />
                  <StatTile label="Blocked" value={release.quality.automation.blocked} />
                  <StatTile label="Not Run" value={release.quality.automation.notRun} />
                </Stack>
              ) : (
                <NotAvailable label="automation" />
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                API Testing
              </Typography>
              {release.quality.apiTesting ? (
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  <StatTile label="Requests" value={release.quality.apiTesting.totalRequests} />
                  <StatTile label="Executions" value={release.quality.apiTesting.totalExecutions} />
                  <StatTile label="Passed" value={release.quality.apiTesting.passedCount} />
                  <StatTile label="Failed" value={release.quality.apiTesting.failedCount} />
                  <StatTile label="No Assertion" value={release.quality.apiTesting.noAssertionCount} />
                </Stack>
              ) : (
                <NotAvailable label="API testing" />
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Performance Testing
              </Typography>
              {release.quality.performance ? (
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  <StatTile label="Total" value={release.quality.performance.total} />
                  <StatTile label="Passed" value={release.quality.performance.passed} />
                  <StatTile label="Failed" value={release.quality.performance.failed} />
                  <StatTile label="Queued/Running" value={release.quality.performance.queuedOrRunning} />
                  <StatTile label="Stopped" value={release.quality.performance.stopped} />
                  <StatTile label="Never Run" value={release.quality.performance.neverRun} />
                </Stack>
              ) : (
                <NotAvailable label="performance testing" />
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Security Testing
              </Typography>
              {release.quality.security ? (
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  <StatTile label="Tests" value={release.quality.security.totalTests} />
                  <StatTile label="Findings" value={release.quality.security.totalFindings} />
                  <StatTile label="Critical" value={release.quality.security.severityCounts.critical} />
                  <StatTile label="High" value={release.quality.security.severityCounts.high} />
                  <StatTile label="Open Critical/High" value={release.quality.security.openCriticalHighCount} />
                </Stack>
              ) : (
                <NotAvailable label="security testing" />
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                UAT
              </Typography>
              {release.quality.uat ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                    <StatTile label="Cycles" value={release.quality.uat.totalCycles} />
                    <StatTile label="Approved" value={release.quality.uat.statusCounts.approved} />
                    <StatTile label="Rejected" value={release.quality.uat.statusCounts.rejected} />
                    <StatTile label="In Progress" value={release.quality.uat.statusCounts.inProgress} />
                  </Stack>
                  {release.quality.uat.latestCycle && (
                    <Typography variant="caption" color="text.secondary">
                      Latest cycle: {release.quality.uat.latestCycle.name} —{' '}
                      {release.quality.uat.latestCycle.status}
                      {release.quality.uat.latestCycle.signOffBy
                        ? ` (signed off by ${release.quality.uat.latestCycle.signOffBy})`
                        : ''}
                    </Typography>
                  )}
                </Stack>
              ) : (
                <NotAvailable label="UAT" />
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <ProductDetailDialog productId={viewingProductId} onClose={() => setViewingProductId(null)} />
    </Dialog>
  );
}
