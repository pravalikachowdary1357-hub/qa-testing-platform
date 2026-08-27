import { Box, Grid, Paper, Typography } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GavelIcon from '@mui/icons-material/Gavel';

const PRINCIPLES = [
  {
    title: 'Traceability by Design',
    description: 'Testing artifacts remain connected throughout the lifecycle.',
    icon: AccountTreeIcon,
  },
  {
    title: 'Compliance from Day One',
    description: 'RBAC, approvals, audit history, and accountability are built into the platform.',
    icon: VerifiedUserIcon,
  },
  {
    title: 'Complete QA Lifecycle',
    description: 'Manual, automation, API, performance, security, and UAT testing work together.',
    icon: WorkspacePremiumIcon,
  },
  {
    title: 'AI as an Assistant',
    description: 'AI supports QA teams while the core testing platform works independently.',
    icon: AutoAwesomeIcon,
  },
  {
    title: 'Release Decisions Based on Evidence',
    description: 'Quality decisions come from actual testing data rather than spreadsheets.',
    icon: GavelIcon,
  },
];

export function WhyChooseSection() {
  return (
    <Box id="why-choose-us" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            Why TestSphere
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Principles the build itself is held to
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {PRINCIPLES.map((p) => {
            const Icon = p.icon;
            return (
              <Grid key={p.title} size={{ xs: 12, sm: 6, md: 4 }}>
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
