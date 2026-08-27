import { Box, Grid, Paper, Typography } from '@mui/material';

const STAGES = [
  { n: 1, title: 'Requirement', desc: 'What needs to be true' },
  { n: 2, title: 'Test Scenario', desc: 'What needs to be verified' },
  { n: 3, title: 'Test Case', desc: 'Exact steps & expected result' },
  { n: 4, title: 'Test Execution', desc: 'Run it, log the result' },
  { n: 5, title: 'Defect', desc: 'Failures become tracked issues' },
  { n: 6, title: 'Retest', desc: 'Fix verified, loop closes' },
  { n: 7, title: 'Release', desc: 'Quality score decides go / no-go' },
];

export function HowItWorksSection() {
  return (
    <Box id="how-it-works" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            How it works
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            The TestSphere Lifecycle
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Requirement → Test Scenario → Test Case → Test Execution → Defect → Retest → Release. Every stage remains
            connected so teams can trace quality from the original requirement through release.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {STAGES.map((stage) => (
            <Grid key={stage.n} size={{ xs: 6, sm: 4, md: 12 / 7 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  height: '100%',
                  borderRadius: 3,
                  textAlign: 'center',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    mx: 'auto',
                    mb: 1.5,
                  }}
                >
                  {stage.n}
                </Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{stage.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stage.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
