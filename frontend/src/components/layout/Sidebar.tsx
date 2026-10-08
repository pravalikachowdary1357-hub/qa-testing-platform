import { Box, Drawer, List, Toolbar, Typography } from '@mui/material';
import { NavItem } from './NavItem';
import { navItems } from '../../routes/routeConfig';
import { useAuth } from '../../context/AuthContext';
import testSphereLogo from '../../assets/testsphere-logo.png';
import { MODULE_THEMES, SIDEBAR, SIDEBAR_GROUPS, moduleKeyFromPath } from '../../theme/moduleThemes';

export const DRAWER_WIDTH = 260;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        px: 2,
        pt: 2,
        pb: 0.75,
        color: SIDEBAR.muted,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontSize: '0.68rem',
      }}
    >
      {children}
    </Typography>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  // Products are managed inside the Projects page (each project row expands to
  // show its products), so the separate Products entry is hidden from the menu.
  // The /products route itself still exists in case anything links to it.
  const visibleNavItems = navItems.filter(
    (item) => item.path !== '/products' && (!item.permission || hasPermission(item.permission)),
  );
  const groupOf = (path: string) => MODULE_THEMES[moduleKeyFromPath(path)]?.group ?? 'main';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: SIDEBAR.background }}>
      <Toolbar
        sx={{
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 0.25,
          py: 1,
          flexShrink: 0,
          bgcolor: '#fff',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box component="img" src={testSphereLogo} alt="TestSphere" sx={{ height: 32, width: 'auto' }} />
        {user?.roleName && (
          <Typography variant="caption" noWrap sx={{ pl: 0.25, fontSize: '0.8rem', fontWeight: 600, color: 'secondary.main' }}>
            {user.roleName}
          </Typography>
        )}
      </Toolbar>
      <Box sx={{ overflowY: 'auto', flexGrow: 1, pb: 2 }}>
        {SIDEBAR_GROUPS.map((group) => {
          const items = visibleNavItems.filter((item) => groupOf(item.path) === group.key);
          if (items.length === 0) return null;
          return (
            <Box key={group.key}>
              <SectionLabel>{group.key === 'main' ? `${user?.roleName ?? 'My'} tools` : group.label}</SectionLabel>
              <List disablePadding sx={{ px: 1 }}>
                {items.map((item) => (
                  <NavItem key={item.path} item={item} onNavigate={onClose} />
                ))}
              </List>
            </Box>
          );
        })}
      </Box>
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
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
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
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
