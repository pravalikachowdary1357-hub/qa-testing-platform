import { Box, Grid, Paper, Typography } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TuneIcon from '@mui/icons-material/Tune';

const PRINCIPLES = [
  {
    title: 'Traceability by design',
    description:
      'The core value loop — Requirement → Scenario → Case → Execution → Defect → Retest → Release — drives the data model itself, not an afterthought bolted onto a generic issue tracker.',
    icon: AccountTreeIcon,
  },
  {
    title: 'Compliance from day one',
    description:
      'Every module carries a real audit trail and role-based permissions in the data layer itself, because retrofitting compliance later is expensive — and risky.',
    icon: VerifiedUserIcon,
  },
  {
    title: 'AI as a layer, never a dependency',
    description:
      'AI features sit on top of a stable data model and stay strictly opt-in — the core test lifecycle works completely without them.',
    icon: AutoAwesomeIcon,
  },
  {
    title: 'Practical, not exhaustive',
    description:
      'Six roles, not ten. Every permission maps to what a person actually does inside a module, not just what they’re allowed to look at.',
    icon: TuneIcon,
  },
];

export function WhyChooseSection() {
  return (
    <Box id="why-choose-us" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            Why choose us
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Principles the build itself is held to
          </Typography>
          <Typography variant="body1" color="text.secondary">
            These aren&apos;t marketing lines — they&apos;re the guiding principles behind how TestSphere is designed
            and built.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <Grid key={p.title} size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'rgba(0,137,123,0.1)',
                      color: 'secondary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>{p.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.description}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}
