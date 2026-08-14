import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { navItems } from '../../routes/routeConfig';

export function Breadcrumbs() {
  const location = useLocation();
  const current = navItems.find((item) => item.path === location.pathname);
  const isDashboard = !current || current.path === '/';

  return (
    <MuiBreadcrumbs sx={{ mb: 2 }}>
      {isDashboard ? (
        <Typography color="text.primary">Dashboard</Typography>
      ) : (
        [
          <MuiLink key="home" component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </MuiLink>,
          <Typography key="current" color="text.primary">
            {current.label}
          </Typography>,
        ]
      )}
    </MuiBreadcrumbs>
  );
}
