import { Box, Drawer, List, Toolbar, Typography } from '@mui/material';
import { NavItem } from './NavItem';
import { navItems } from '../../routes/routeConfig';
import { useAuth } from '../../context/AuthContext';
import testSphereLogo from '../../assets/testsphere-logo.png';

export const DRAWER_WIDTH = 260;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  const drawerContent = (
    <Box sx={{ overflowY: 'auto', height: '100%' }}>
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 0.25, py: 1 }}>
        <Box
          component="img"
          src={testSphereLogo}
          alt="TestSphere"
          sx={{ height: 32, width: 'auto' }}
        />
        {user?.roleName && (
          <Typography
            variant="caption"
            noWrap
            sx={{ pl: 0.25, fontSize: '0.8rem', fontWeight: 600, color: 'secondary.main' }}
          >
            {user.roleName}
          </Typography>
        )}
      </Toolbar>
      <List sx={{ px: 1 }}>
        {visibleNavItems.map((item) => (
          <NavItem key={item.path} item={item} onNavigate={onClose} />
        ))}
      </List>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
      {/* Temporary drawer: overlays content, used on small screens */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Permanent drawer: always visible, used on sm screens and up */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
