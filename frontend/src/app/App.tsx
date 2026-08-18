import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '../theme/theme';
import { ProductProvider } from '../context/ProductContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { RequireAuth } from '../components/auth/RequireAuth';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { navItems } from '../routes/routeConfig';

// A route the sidebar hides for lack of permission must also be unreachable
// by direct URL -- so route registration is filtered by the same
// permission check, not just the sidebar's rendering.
function AppRoutes() {
  const { user, authLoading, hasPermission } = useAuth();
  const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));
  // Dashboard's path ('/') is also the public marketing home page's path when
  // signed out -- pull it out of the mapped loop so it can render either
  // element depending on auth state instead of always being gated.
  const dashboardNavItem = visibleNavItems.find((item) => item.path === '/');
  const otherNavItems = visibleNavItems.filter((item) => item.path !== '/');

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={user ? <MainLayout /> : <HomePage />}>
        {user && dashboardNavItem && <Route index element={dashboardNavItem.element} />}
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          {otherNavItems.map((item) => (
            <Route key={item.path} path={item.path} element={item.element} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ProductProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ProductProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
