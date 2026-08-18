import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';

export function CtaSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 10 } }}>
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 6 },
          borderRadius: 5,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #0F4C81 0%, #00897B 100%)',
          color: '#fff',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.5rem', md: '2rem' } }}>
          Ready to see it end to end?
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 4, maxWidth: 560, mx: 'auto' }}>
          Sign in with a demo account and walk the workflow yourself — six roles, real permissions, real data.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', flexWrap: 'wrap', rowGap: 2 }}>
          <Button
            component={RouterLink}
            to="/login?demo=1"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{ bgcolor: '#fff', color: 'primary.main', fontWeight: 700, '&:hover': { bgcolor: '#EAF4FD' } }}
          >
            View Demo Accounts
          </Button>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            size="large"
            sx={{ borderColor: 'rgba(255,255,255,0.6)', color: '#fff', fontWeight: 700, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            Sign In
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
