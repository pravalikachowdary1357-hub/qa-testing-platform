import { Link, useLocation } from 'react-router-dom';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import type { NavItemConfig } from '../../types/navigation';

interface NavItemProps {
  item: NavItemConfig;
  onNavigate?: () => void;
}

export function NavItem({ item, onNavigate }: NavItemProps) {
  const location = useLocation();
  const selected = location.pathname === item.path;
  const Icon = item.icon;

  return (
    <ListItemButton
      component={Link}
      to={item.path}
      selected={selected}
      onClick={onNavigate}
      sx={{ borderRadius: 1, mb: 0.5 }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        slotProps={{
          primary: { variant: 'body2', sx: { fontWeight: selected ? 600 : 400 } },
        }}
      />
    </ListItemButton>
  );
}
