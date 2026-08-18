import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';

const KPI_TILES = [
  { label: 'Requirement coverage', value: '78%', color: '#0F4C81' },
  { label: 'Pass rate', value: '91%', color: '#00897B' },
  { label: 'Open defects · 3 critical', value: '14', color: '#C62828' },
  { label: 'Release readiness', value: 'Conditional', color: '#B45309' },
];

const RESULT_SEGMENTS = [
  { label: 'Pass', value: 91, color: '#00897B' },
  { label: 'Fail', value: 6, color: '#C62828' },
  { label: 'Blocked', value: 2, color: '#B45309' },
  { label: 'Not run', value: 1, color: '#90A4AE' },
];

export function DashboardPreviewSection() {
  let cumulative = 0;
  const gradientStops = RESULT_SEGMENTS.map((seg) => {
    const start = cumulative;
    cumulative += seg.value;
    return `${seg.color} ${start}% ${cumulative}%`;
  }).join(', ');

  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Grid container spacing={6} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
              Preview
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
              See your test program at a glance
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460 }}>
              A look at the QA Manager dashboard we&apos;re building next — KPI tiles computed straight from your
              requirements, executions, and defects, with no manual rollups.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ borderRadius: 4, p: { xs: 2.5, md: 4 }, boxShadow: '0 20px 50px rgba(15,76,129,0.12)' }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  QA Manager Dashboard
                </Typography>
                <Chip label="Preview" size="small" sx={{ bgcolor: '#FEF3D6', color: '#8A6D00', fontWeight: 700 }} />
              </Stack>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {KPI_TILES.map((tile) => (
                  <Grid key={tile.label} size={{ xs: 6, md: 3 }}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default', height: '100%' }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: tile.color }}>
                        {tile.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {tile.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                Execution Results · Cycle 12
              </Typography>
              <Stack direction="row" spacing={3} sx={{ alignItems: 'center', mt: 1.5 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: `conic-gradient(${gradientStops})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: 'background.paper' }} />
                </Box>
                <Stack spacing={0.75} sx={{ flexGrow: 1 }}>
                  {RESULT_SEGMENTS.map((seg) => (
                    <Stack key={seg.label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {seg.label} · {seg.value}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, fontStyle: 'italic' }}>
                Illustrative preview using sample data.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
