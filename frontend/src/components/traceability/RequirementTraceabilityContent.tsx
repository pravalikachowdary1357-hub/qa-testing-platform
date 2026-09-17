import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { StatusChip } from '../common/StatusChip';
import { TestScenarioDetailDialog } from '../testscenario/TestScenarioDetailDialog';
import { TestCaseDetailDialog } from '../testcase/TestCaseDetailDialog';
import { TestExecutionDetailDialog } from '../testexecution/TestExecutionDetailDialog';
import { DefectDetailDialog } from '../defect/DefectDetailDialog';
import { COVERAGE_STATUS_LABELS, LATEST_EXECUTION_STATUS_LABELS } from '../../types/traceability';
import type { TraceabilityRequirementRow } from '../../types/traceability';

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const REQUIREMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

const SCENARIO_TYPE_LABELS: Record<string, string> = {
  FUNCTIONAL: 'Functional',
  REGRESSION: 'Regression',
  INTEGRATION: 'Integration',
  SMOKE: 'Smoke',
  EDGE_CASE: 'Edge Case',
};

const SCENARIO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

interface RequirementTraceabilityContentProps {
  requirement: TraceabilityRequirementRow;
  // The standalone dialog shows its own title/subtitle; the embedded tab
  // already has both on the Requirement Workspace header, so it skips this.
  showHeader?: boolean;
}

// Shared by RequirementTraceabilityDetailDialog (the standalone Traceability
// page's row drill-down) and RequirementTraceabilityTab (the Requirement
// Workspace's Traceability tab) so both render the exact same computed
// coverage tree instead of two parallel implementations.
export function RequirementTraceabilityContent({
  requirement,
  showHeader = true,
}: RequirementTraceabilityContentProps) {
  const [viewingScenarioId, setViewingScenarioId] = useState<string | null>(null);
  const [viewingTestCaseId, setViewingTestCaseId] = useState<string | null>(null);
  const [viewingExecutionId, setViewingExecutionId] = useState<string | null>(null);
  const [viewingDefectId, setViewingDefectId] = useState<string | null>(null);

  return (
    <>
      <Stack spacing={2}>
        {showHeader && (
          <Box>
            <Typography variant="h6">{requirement.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {requirement.product.name}
            </Typography>
          </Box>
        )}

        <Stack direction="row" spacing={1}>
          <StatusChip status={PRIORITY_LABELS[requirement.priority]} />
          <StatusChip status={REQUIREMENT_STATUS_LABELS[requirement.status]} />
          <StatusChip status={COVERAGE_STATUS_LABELS[requirement.coverageStatus]} />
        </Stack>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Coverage Summary
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {[
              { label: 'Scenarios', value: requirement.testScenarioCount },
              { label: 'Test Cases', value: requirement.testCaseCount },
              { label: 'Coverage', value: `${requirement.coveragePercent}%` },
              { label: 'Pass', value: requirement.resultCounts.pass },
              { label: 'Fail', value: requirement.resultCounts.fail },
              { label: 'Blocked', value: requirement.resultCounts.blocked },
              { label: 'Pending', value: requirement.resultCounts.pending },
              { label: 'Not Run', value: requirement.resultCounts.notRun },
              { label: 'Defects', value: requirement.defectCount },
            ].map((item) => (
              <Paper
                key={item.label}
                variant="outlined"
                sx={{ p: 1.5, minWidth: 84, textAlign: 'center' }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Test Scenarios ({requirement.testScenarios.length})
          </Typography>

          {requirement.testScenarios.length === 0 && (
            <Alert severity="warning">
              No test scenarios are linked to this requirement yet — it has no test coverage.
            </Alert>
          )}

          {requirement.testScenarios.map((scenario) => (
            <Paper key={scenario.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap' }}
              >
                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">{scenario.title}</Typography>
                  <StatusChip status={SCENARIO_TYPE_LABELS[scenario.type]} />
                  <StatusChip status={PRIORITY_LABELS[scenario.priority]} />
                  <StatusChip status={SCENARIO_STATUS_LABELS[scenario.status]} />
                </Stack>
                <Tooltip title="View Scenario">
                  <IconButton size="small" onClick={() => setViewingScenarioId(scenario.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {scenario.testCases.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No test cases in this scenario yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Test Case</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>Defects</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scenario.testCases.map((testCase) => {
                        const latestExecution = testCase.latestExecution;
                        return (
                          <TableRow key={testCase.id} hover>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Typography variant="body2" noWrap>
                                {testCase.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <StatusChip status={PRIORITY_LABELS[testCase.priority]} />
                            </TableCell>
                            <TableCell>
                              <StatusChip
                                status={LATEST_EXECUTION_STATUS_LABELS[testCase.latestExecutionStatus]}
                              />
                            </TableCell>
                            <TableCell>
                              {testCase.defects.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  —
                                </Typography>
                              ) : (
                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                                  {testCase.defects.map((defect) => (
                                    <Chip
                                      key={defect.id}
                                      label={defect.title}
                                      size="small"
                                      clickable
                                      onClick={() => setViewingDefectId(defect.id)}
                                      color={
                                        defect.severity === 'CRITICAL' || defect.severity === 'MAJOR'
                                          ? 'error'
                                          : 'default'
                                      }
                                      variant={
                                        defect.severity === 'CRITICAL' || defect.severity === 'MAJOR'
                                          ? 'filled'
                                          : 'outlined'
                                      }
                                    />
                                  ))}
                                </Stack>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Test Case">
                                <IconButton size="small" onClick={() => setViewingTestCaseId(testCase.id)}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {latestExecution && (
                                <Tooltip title="View Latest Execution">
                                  <IconButton
                                    size="small"
                                    onClick={() => setViewingExecutionId(latestExecution.id)}
                                  >
                                    <PlayCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          ))}
        </Box>
      </Stack>

      <TestScenarioDetailDialog testScenarioId={viewingScenarioId} onClose={() => setViewingScenarioId(null)} />
      <TestCaseDetailDialog testCaseId={viewingTestCaseId} onClose={() => setViewingTestCaseId(null)} />
      <TestExecutionDetailDialog
        testExecutionId={viewingExecutionId}
        onClose={() => setViewingExecutionId(null)}
      />
      <DefectDetailDialog defectId={viewingDefectId} onClose={() => setViewingDefectId(null)} />
    </>
  );
}
