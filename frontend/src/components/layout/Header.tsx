import { useState } from 'react';
import type { MouseEvent } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Toolbar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import { NotificationBell } from './NotificationBell';
import { ProductSwitcher } from '../product/ProductSwitcher';
import { DRAWER_WIDTH } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import testSphereLogo from '../../assets/testsphere-logo.png';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAvatarClick = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const initial = user?.name.trim().charAt(0).toUpperCase() || '?';
  const handleSignOut = async () => {
    handleMenuClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { sm: `${DRAWER_WIDTH}px` },
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { sm: 'none' } }}
          aria-label="Open navigation menu"
        >
          <MenuIcon />
        </IconButton>

        <Box
          component="img"
          src={testSphereLogo}
          alt="TestSphere"
          sx={{ height: 28, width: 'auto', display: { xs: 'block', sm: 'none' } }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <ProductSwitcher />

        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            width: 220,
          }}
        >
          <SearchIcon fontSize="small" color="action" />
          <InputBase placeholder="Search..." fullWidth sx={{ fontSize: 14 }} />
        </Box>

        <NotificationBell />

        <IconButton onClick={handleAvatarClick} size="small" aria-label="User menu">
          <Avatar sx={{ width: 32, height: 32 }}>{initial}</Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem disabled>{user?.email ?? 'Not signed in'}</MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/settings');
            }}
          >
            Profile &amp; Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
