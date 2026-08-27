import { Box, Grid, Typography } from '@mui/material';

const STATS = [
  { value: '7', label: 'stages in the traceability chain' },
  { value: '6', label: 'built-in roles, Tester to System Administrator' },
  { value: '14', label: 'integrated testing modules' },
  { value: 'Session · RBAC', label: 'protecting every session and route' },
];

export function StatsStrip() {
  return (
    <Box sx={{ bgcolor: 'primary.main', color: '#fff', py: { xs: 5, md: 6 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Grid container spacing={3}>
          {STATS.map((stat) => (
            <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {stat.label}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
