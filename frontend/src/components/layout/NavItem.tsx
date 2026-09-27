import { Link, useLocation } from 'react-router-dom';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import type { NavItemConfig } from '../../types/navigation';
import { SIDEBAR } from '../../theme/moduleThemes';

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
      sx={{
        borderRadius: 1.5,
        mb: 0.25,
        py: 0.75,
        color: SIDEBAR.text,
        '& .MuiListItemIcon-root': { color: SIDEBAR.text },
        '&:hover': { bgcolor: SIDEBAR.hover },
        '&.Mui-selected, &.Mui-selected:hover': {
          bgcolor: SIDEBAR.selectedBg,
          color: SIDEBAR.selectedText,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          '& .MuiListItemIcon-root': { color: SIDEBAR.selectedText },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        slotProps={{
          primary: { variant: 'body2', sx: { fontWeight: selected ? 700 : 500 } },
        }}
      />
    </ListItemButton>
  );
}
