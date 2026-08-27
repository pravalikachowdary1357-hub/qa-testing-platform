import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import BugReportIcon from '@mui/icons-material/BugReport';
import ReplayIcon from '@mui/icons-material/Replay';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HistoryIcon from '@mui/icons-material/History';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { Link as RouterLink } from 'react-router-dom';

const CHAIN_STEPS = [
  { label: 'Requirement', icon: AssignmentIcon, tone: '#EF6C00' },
  { label: 'Test Scenario', icon: ChecklistIcon, tone: '#EF6C00' },
  { label: 'Test Case', icon: FactCheckIcon, tone: '#EF6C00' },
  { label: 'Test Execution', icon: PlayCircleIcon, tone: '#EF6C00' },
  { label: 'Defect', icon: BugReportIcon, tone: '#EF6C00' },
  { label: 'Retest', icon: ReplayIcon, tone: '#EF6C00' },
  { label: 'Release', icon: RocketLaunchIcon, tone: '#00897B', done: true },
];

const TRUST_BADGES = [
  { label: 'Session + RBAC secured', icon: ShieldOutlinedIcon },
  { label: 'Full audit trail', icon: HistoryIcon },
  { label: 'End-to-end traceability', icon: AccountTreeIcon },
  { label: 'Complete QA lifecycle', icon: TaskAltIcon },
];

export function HeroSection() {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 8, md: 12 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: 6, md: 4 },
        }}
      >
        <Box sx={{ flex: '1 1 520px', minWidth: 0 }}>
          <Chip
            label="QMICS · Test Management & QA Platform"
            sx={{ bgcolor: 'background.paper', boxShadow: 1, fontWeight: 700, mb: 3, px: 1 }}
          />
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.1, mb: 3, fontSize: { xs: '2.25rem', md: '3rem' } }}>
            <Box component="span" sx={{ color: '#0F1B2B' }}>One platform for the </Box>
            <Box component="span" sx={{ color: '#B45309' }}>entire test lifecycle.</Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400, maxWidth: 560 }}>
            Requirements, test planning, test cases, executions, defects, UAT, automation, and release quality —
            connected end to end.
          </Typography>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2, mb: 4 }}>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ fontWeight: 700, px: 3 }}
            >
              Sign In
            </Button>
            <Button
              component="a"
              href="#how-it-works"
              variant="outlined"
              size="large"
              startIcon={<PlayCircleOutlineIcon />}
              sx={{ fontWeight: 700, px: 3, borderColor: 'divider', color: 'text.primary', bgcolor: 'background.paper' }}
            >
              See how it works
            </Button>
          </Stack>

          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
            {TRUST_BADGES.map(({ label, icon: Icon }) => (
              <Stack key={label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Icon sx={{ fontSize: 18 }} color="secondary" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: '1 1 420px', minWidth: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 4,
              p: 3.5,
              boxShadow: '0 24px 60px rgba(15,76,129,0.18)',
            }}
          >
            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
              The TestSphere Lifecycle
            </Typography>
            <Stack sx={{ mt: 2, position: 'relative' }}>
              <Box
                aria-hidden
                sx={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: '2px', bgcolor: 'divider' }}
              />
              {CHAIN_STEPS.map((step) => {
                const StepIcon = step.icon;
                return (
                  <Stack
                    key={step.label}
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: 'center', py: 1.25, position: 'relative' }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: step.done ? step.tone : 'background.paper',
                        border: '2px solid',
                        borderColor: step.tone,
                        color: step.done ? '#fff' : step.tone,
                        zIndex: 1,
                      }}
                    >
                      <StepIcon fontSize="small" />
                    </Box>
                    <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{step.label}</Typography>
                    {step.done && <Chip label="Ready" size="small" sx={{ bgcolor: '#E0F2F1', color: '#00695C', fontWeight: 700 }} />}
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
