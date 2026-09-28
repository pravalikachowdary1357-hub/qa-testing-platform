import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import type { TestPlanMilestone } from '../../types/testPlan';
import type { GovernanceValues } from './governance';
import { TEST_LEVEL_LABELS, TEST_TYPE_LABELS } from './testPlanLabels';

interface Props {
  values: GovernanceValues;
  onChange: (next: GovernanceValues) => void;
}

function MultiChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T[];
  options: Record<T, string>;
  onChange: (next: T[]) => void;
}) {
  return (
    <TextField
      select
      label={label}
      fullWidth
      value={value}
      onChange={(e) => {
        const raw = e.target.value as unknown;
        onChange((typeof raw === 'string' ? raw.split(',').filter(Boolean) : raw) as T[]);
      }}
      slotProps={{
        select: {
          multiple: true,
          renderValue: (selected) => (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as T[]).map((v) => (
                <Chip key={v} size="small" label={options[v]} />
              ))}
            </Stack>
          ),
        },
      }}
    >
      {(Object.keys(options) as T[]).map((key) => (
        <MenuItem key={key} value={key}>
          {options[key]}
        </MenuItem>
      ))}
    </TextField>
  );
}

// Test strategy & governance section of the test plan form (Roles &
// Responsibilities section 3 -- the Test Manager's planning duties).
export function TestPlanGovernanceFields({ values, onChange }: Props) {
  const set = <K extends keyof GovernanceValues>(key: K, value: GovernanceValues[K]) =>
    onChange({ ...values, [key]: value });
  const setMilestone = (index: number, patch: Partial<TestPlanMilestone>) =>
    set(
      'milestones',
      values.milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );

  return (
    <Stack spacing={2}>
      <Divider />
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Test strategy &amp; governance
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Scope, levels and types, effort, resources, milestones, risks and the completion
          criteria the Test Manager approves.
        </Typography>
      </Box>
      <FormControlLabel
        control={
          <Checkbox checked={values.isMaster} onChange={(e) => set('isMaster', e.target.checked)} />
        }
        label="Master test plan (overall test strategy for the product)"
      />
      <TextField
        label="Scope (in / out of scope)"
        fullWidth
        multiline
        minRows={2}
        value={values.scope}
        onChange={(e) => set('scope', e.target.value)}
      />
      <TextField
        label="Objectives"
        fullWidth
        multiline
        minRows={2}
        value={values.objectives}
        onChange={(e) => set('objectives', e.target.value)}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <MultiChipSelect
          label="Testing levels"
          value={values.testLevels}
          options={TEST_LEVEL_LABELS}
          onChange={(v) => set('testLevels', v)}
        />
        <MultiChipSelect
          label="Testing types"
          value={values.testTypes}
          options={TEST_TYPE_LABELS}
          onChange={(v) => set('testTypes', v)}
        />
      </Stack>
      <TextField
        label="Test approach / strategy"
        fullWidth
        multiline
        minRows={2}
        value={values.approach}
        onChange={(e) => set('approach', e.target.value)}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Entry criteria"
          fullWidth
          multiline
          minRows={2}
          value={values.entryCriteria}
          onChange={(e) => set('entryCriteria', e.target.value)}
        />
        <TextField
          label="Exit (completion) criteria"
          fullWidth
          multiline
          minRows={2}
          value={values.exitCriteria}
          helperText="Required before the plan can be approved"
          onChange={(e) => set('exitCriteria', e.target.value)}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Estimated effort (hours)"
          type="number"
          sx={{ width: { xs: '100%', sm: 220 } }}
          value={values.estimatedEffortHours}
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
          onChange={(e) => set('estimatedEffortHours', e.target.value)}
        />
        <TextField
          label="Resources (people, environments, tools)"
          fullWidth
          value={values.resources}
          onChange={(e) => set('resources', e.target.value)}
        />
      </Stack>
      <TextField
        label="Testing risks & mitigation"
        fullWidth
        multiline
        minRows={2}
        value={values.risks}
        onChange={(e) => set('risks', e.target.value)}
      />
      <Box>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">Milestones</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => set('milestones', [...values.milestones, { name: '', dueDate: '', done: false }])}
          >
            Add milestone
          </Button>
        </Stack>
        {values.milestones.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No milestones yet.
          </Typography>
        )}
        <Stack spacing={1}>
          {values.milestones.map((m, index) => (
            <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Checkbox
                checked={Boolean(m.done)}
                onChange={(e) => setMilestone(index, { done: e.target.checked })}
                slotProps={{ input: { 'aria-label': `Milestone ${index + 1} done` } }}
              />
              <TextField
                size="small"
                label="Milestone"
                fullWidth
                value={m.name}
                onChange={(e) => setMilestone(index, { name: e.target.value })}
              />
              <TextField
                size="small"
                label="Due"
                type="date"
                sx={{ width: 170, flexShrink: 0 }}
                value={m.dueDate ?? ''}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => setMilestone(index, { dueDate: e.target.value })}
              />
              <Tooltip title="Remove milestone">
                <IconButton
                  size="small"
                  aria-label={`Remove milestone ${index + 1}`}
                  onClick={() => set('milestones', values.milestones.filter((_, i) => i !== index))}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
