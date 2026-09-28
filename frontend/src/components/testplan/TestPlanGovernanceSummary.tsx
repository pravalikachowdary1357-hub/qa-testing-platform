import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import type { ApiTestPlan } from '../../types/testPlan';
import { TEST_LEVEL_LABELS, TEST_TYPE_LABELS } from './testPlanLabels';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Typography>
    </Box>
  );
}

// Read-only view of a plan's strategy, governance, approval and sign-off.
export function TestPlanGovernanceSummary({ plan }: { plan: ApiTestPlan }) {
  const milestones = plan.milestones ?? [];
  const hasStrategy =
    plan.isMaster ||
    plan.scope ||
    plan.objectives ||
    plan.approach ||
    plan.entryCriteria ||
    plan.exitCriteria ||
    plan.resources ||
    plan.risks ||
    plan.estimatedEffortHours !== null ||
    (plan.testLevels ?? []).length > 0 ||
    (plan.testTypes ?? []).length > 0 ||
    milestones.length > 0;

  return (
    <Stack spacing={2}>
      {plan.reviewedAt && (
        <Alert severity={plan.status === 'DRAFT' ? 'warning' : 'success'}>
          {plan.status === 'DRAFT' ? 'Returned' : 'Approved'} by {plan.reviewedBy?.name ?? 'a Test Manager'} on{' '}
          {new Date(plan.reviewedAt).toLocaleString()}
          {plan.reviewComment ? ` — "${plan.reviewComment}"` : ''}
        </Alert>
      )}
      {plan.completedAt && (
        <Alert severity="success">
          Completion signed off by {plan.completedBy?.name ?? 'a Test Manager'} on{' '}
          {new Date(plan.completedAt).toLocaleString()}
          {plan.completionSummary ? ` — "${plan.completionSummary}"` : ''}
        </Alert>
      )}
      {!hasStrategy ? (
        <Typography variant="body2" color="text.secondary">
          No test strategy or governance details recorded yet.
        </Typography>
      ) : (
        <>
          {plan.isMaster && <Chip color="secondary" label="Master test plan" sx={{ alignSelf: 'flex-start' }} />}
          <Field label="Scope" value={plan.scope} />
          <Field label="Objectives" value={plan.objectives} />
          {((plan.testLevels ?? []).length > 0 || (plan.testTypes ?? []).length > 0) && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Testing levels and types
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {(plan.testLevels ?? []).map((l) => (
                  <Chip key={l} size="small" variant="outlined" label={TEST_LEVEL_LABELS[l] ?? l} />
                ))}
                {(plan.testTypes ?? []).map((t) => (
                  <Chip key={t} size="small" label={TEST_TYPE_LABELS[t] ?? t} />
                ))}
              </Stack>
            </Box>
          )}
          <Field label="Test approach / strategy" value={plan.approach} />
          <Field label="Entry criteria" value={plan.entryCriteria} />
          <Field label="Exit (completion) criteria" value={plan.exitCriteria} />
          <Field
            label="Estimated effort"
            value={plan.estimatedEffortHours !== null ? `${plan.estimatedEffortHours} hours` : null}
          />
          <Field label="Resources" value={plan.resources} />
          <Field label="Testing risks & mitigation" value={plan.risks} />
          {milestones.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Milestones
              </Typography>
              <Stack spacing={0.5}>
                {milestones.map((m, i) => {
                  const overdue = !m.done && m.dueDate && new Date(m.dueDate) < new Date();
                  return (
                    <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip
                        size="small"
                        color={m.done ? 'success' : overdue ? 'error' : 'default'}
                        label={m.done ? 'Done' : overdue ? 'Overdue' : 'Open'}
                      />
                      <Typography variant="body2">
                        {m.name}
                        {m.dueDate ? ` · due ${new Date(m.dueDate).toLocaleDateString()}` : ''}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}
