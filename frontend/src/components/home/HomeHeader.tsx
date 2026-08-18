import { AppBar, Box, Button, Stack, Toolbar } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';
import testSphereLogo from '../../assets/testsphere-logo.png';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'User Roles', href: '#user-roles' },
  { label: 'Why Choose Us', href: '#why-choose-us' },
];

export function HomeHeader() {
  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 4 }, py: 1 }}>
        <Box component="img" src={testSphereLogo} alt="TestSphere" sx={{ height: 32, width: 'auto', mr: 'auto' }} />

        <Stack direction="row" spacing={4} sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' } }}>
          {NAV_LINKS.map((link) => (
            <Box
              key={link.href}
              component="a"
              href={link.href}
              sx={{
                fontSize: 14,
                fontWeight: 600,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {link.label}
            </Box>
          ))}
        </Stack>

        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          color="secondary"
          endIcon={<ArrowForwardIcon />}
          sx={{ ml: { xs: 'auto', md: 4 }, fontWeight: 600, borderRadius: 2.5 }}
        >
          Sign In
        </Button>
      </Toolbar>
    </AppBar>
  );
}
