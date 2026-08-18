import { Box, Chip, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const CARD_SX = {
  borderRadius: 4,
  p: { xs: 2.5, md: 3.5 },
  boxShadow: '0 20px 50px rgba(15,76,129,0.12)',
};

export function TestPlanningVisual() {
  return (
    <Paper elevation={0} sx={CARD_SX}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontWeight: 800 }}>Release 4.2 — Test Plan</Typography>
        <Chip label="Pending approval" size="small" sx={{ bgcolor: '#FEF3D6', color: '#8A6D00', fontWeight: 700 }} />
      </Stack>
      <Stack spacing={1.25} sx={{ mb: 2.5 }}>
        {['Scope & strategy defined', 'Entry criteria agreed', 'Exit criteria agreed'].map((item) => (
          <Stack key={item} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item}</Typography>
          </Stack>
        ))}
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">Aug 18 – Sep 02</Typography>
      <Typography variant="body2" color="text.secondary">Environment: Staging-2 · Booked</Typography>
    </Paper>
  );
}

export function TestCaseVisual() {
  return (
    <Paper elevation={0} sx={CARD_SX}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>TC-014</Typography>
        <Chip label="High" size="small" sx={{ bgcolor: '#FDECEA', color: '#C62828', fontWeight: 700 }} />
        <Chip label="Med risk" size="small" sx={{ bgcolor: '#FEF3D6', color: '#8A6D00', fontWeight: 700 }} />
      </Stack>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Verify password reset token expires after 1 hour</Typography>
      <Stack component="ol" spacing={0.75} sx={{ pl: 2.5, m: 0, mb: 2 }}>
        {['Request a reset link for a valid account', 'Wait 61 minutes', 'Attempt to use the reset link'].map((step) => (
          <Typography key={step} component="li" variant="body2" color="text.secondary">
            {step}
          </Typography>
        ))}
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1}>
          <Chip label="auth" size="small" variant="outlined" />
          <Chip label="regression" size="small" variant="outlined" />
        </Stack>
        <Typography variant="caption" color="text.secondary">v3 · 2 approvals</Typography>
      </Stack>
    </Paper>
  );
}

export function TestExecutionVisual() {
  const tiles = [
    { label: 'Pass', value: 91, color: '#00897B' },
    { label: 'Fail', value: 6, color: '#C62828' },
    { label: 'Blocked', value: 2, color: '#B45309' },
    { label: 'Not run', value: 1, color: '#90A4AE' },
  ];
  return (
    <Paper elevation={0} sx={CARD_SX}>
      <Typography sx={{ fontWeight: 800, mb: 2 }}>Cycle 12 · Sprint 24</Typography>
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={3}>
            <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography sx={{ fontWeight: 800, color: tile.color }}>{tile.value}</Typography>
              <Typography variant="caption" color="text.secondary">{tile.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>TC-014 · Password reset token expiry</Typography>
      <Typography variant="caption" color="text.secondary">Tester: J. Alvarez · Pass</Typography>
    </Paper>
  );
}

export function DefectVisual() {
  const stages = ['New', 'Assigned', 'In Progress', 'Retest', 'Closed'];
  return (
    <Paper elevation={0} sx={CARD_SX}>
      <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
        Defect Lifecycle
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1.5, mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
        {stages.map((stage, i) => (
          <Stack key={stage} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Chip
              label={stage}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: i === stages.length - 1 ? '#E0F2F1' : 'background.default',
                color: i === stages.length - 1 ? '#00695C' : 'text.primary',
              }}
            />
            {i < stages.length - 1 && <Box sx={{ width: 12, height: 2, bgcolor: 'divider' }} />}
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', p: 2, borderRadius: 3, bgcolor: '#FDECEA' }}>
        <WarningAmberIcon sx={{ color: '#C62828', mt: '2px' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>DEF-231 · Login fails on SSO redirect</Typography>
          <Typography variant="caption" color="text.secondary">Critical · linked to TC-014 &amp; REQ-08</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function ReportsVisual() {
  const tiles = [
    { label: 'Coverage', value: '78%' },
    { label: 'Pass rate', value: '91%' },
    { label: 'Critical defects', value: '2' },
  ];
  return (
    <Paper elevation={0} sx={CARD_SX}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'center', mb: 2.5 }}>
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'conic-gradient(#00897B 0% 82%, #E0E0E0 82% 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 62,
              height: 62,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Typography sx={{ fontWeight: 800, lineHeight: 1 }}>82</Typography>
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>Release Quality Score</Typography>
          <Chip label="Conditional" size="small" sx={{ bgcolor: '#FEF3D6', color: '#8A6D00', fontWeight: 700, mt: 0.5 }} />
        </Box>
      </Stack>
      <Grid container spacing={1.5}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={4}>
            <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
              <Typography sx={{ fontWeight: 800 }}>{tile.value}</Typography>
              <Typography variant="caption" color="text.secondary">{tile.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export function WorkflowVisual() {
  const chain = [
    { label: 'Requirement', status: 'Approved · B. Chen', done: true },
    { label: 'Test Plan', status: 'Approved · T. Osei', done: true },
    { label: 'Release', status: 'Awaiting · QA Manager', done: false },
  ];
  return (
    <Paper elevation={0} sx={CARD_SX}>
      <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
        Approval Chain
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {chain.map((step) => (
          <Stack
            key={step.label}
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}
          >
            <Typography sx={{ fontWeight: 700 }}>{step.label}</Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: step.done ? '#00695C' : '#8A6D00' }}
            >
              {step.status}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
