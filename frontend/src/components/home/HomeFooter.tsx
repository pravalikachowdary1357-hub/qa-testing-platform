import { Box, Divider, Grid, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Link as RouterLink } from 'react-router-dom';
import testSphereLogoLight from '../../assets/testsphere-logo.png';
import { floatY } from '../../utils/motion';

const PRODUCT_LINKS = [
  { label: 'Product Tour', href: '#how-it-works' },
  { label: 'Modules', href: '#features' },
  { label: 'User Roles', href: '#user-roles' },
  { label: 'Why TestSphere', href: '#why-choose-us' },
];

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#0B1F2A', color: 'rgba(255,255,255,0.85)' }}>
      <BugReportIcon
        aria-hidden
        sx={{
          position: 'absolute',
          top: 24,
          right: 24,
          fontSize: 28,
          color: 'rgba(255,255,255,0.12)',
          animation: `${floatY} 7s ease-in-out infinite`,
        }}
      />

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, pt: { xs: 6, md: 4 }, pb: 3 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              component="img"
              src={testSphereLogoLight}
              alt="TestSphere"
              sx={{ height: 32, width: 'auto', mb: 2, bgcolor: '#fff', borderRadius: 1.5, p: 0.75 }}
            />
            <Typography variant="body2" sx={{ opacity: 0.75, maxWidth: 340 }}>
              The QMICS platform for end-to-end test management — requirements, cases, execution, and defects,
              connected by one traceability chain.
            </Typography>
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, opacity: 0.6 }}>
              Product
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {PRODUCT_LINKS.map((link) => (
                <Box
                  key={link.label}
                  component="a"
                  href={link.href}
                  sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14, '&:hover': { color: '#fff' } }}
                >
                  {link.label}
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, opacity: 0.6 }}>
              Account
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              <Box
                component={RouterLink}
                to="/login"
                sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14, '&:hover': { color: '#fff' } }}
              >
                Sign In
              </Box>
              <Box
                component={RouterLink}
                to="/login"
                sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14, '&:hover': { color: '#fff' } }}
              >
                Forgot Password
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
              <LocationOnIcon sx={{ fontSize: 20, color: '#F2B705' }} />
              <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, opacity: 0.6 }}>
                Location
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              V Starx IT Hub, Plot No:55, 4th Floor,
              <br />
              15th Phase, Green Hills Road,
              <br />
              KPHB Colony, Kukatpally,
              <br />
              Hyderabad - 500072
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.6 }}>
          © {year} QMICS. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
