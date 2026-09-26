import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import type { ApiNotification } from '../../types/adminConfig';

const POLL_MS = 60_000;

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

// Real in-app notifications: the unread count is polled every minute (and
// when the tab regains focus); opening the bell lists the latest ones.
export function NotificationBell() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshCount = useCallback(() => {
    fetchUnreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => {
        // Keep the last known count; the bell stays usable.
      });
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshCount]);

  const open = (event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
    setItems(null);
    setError(null);
    fetchNotifications(false, 20)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications.'));
    refreshCount();
  };

  const openItem = async (n: ApiNotification) => {
    if (!n.readAt) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? prev);
      setUnread((c) => Math.max(0, c - 1));
      await markNotificationRead(n.id).catch(() => undefined);
    }
    if (n.link) {
      setAnchor(null);
      navigate(n.link);
    }
  };

  const readAll = async () => {
    await markAllNotificationsRead().catch(() => undefined);
    const now = new Date().toISOString();
    setItems((prev) => prev?.map((x) => ({ ...x, readAt: x.readAt ?? now })) ?? prev);
    setUnread(0);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          onClick={open}
        >
          <Badge color="error" badgeContent={unread} max={99} invisible={unread === 0}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 32px)' } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          <Button size="small" disabled={unread === 0} onClick={() => void readAll()}>
            Mark all read
          </Button>
        </Stack>
        <Divider />
        {error && (
          <Typography color="error" variant="body2" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}
        {!error && items === null && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {items && items.length === 0 && (
          <Typography color="text.secondary" variant="body2" sx={{ p: 3, textAlign: 'center' }}>
            You have no notifications.
          </Typography>
        )}
        {items && items.length > 0 && (
          <List dense disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => void openItem(n)}
                sx={{ alignItems: 'flex-start', bgcolor: n.readAt ? undefined : 'action.hover' }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: n.readAt ? 400 : 600 }}>
                        {n.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {timeAgo(n.createdAt)}
                      </Typography>
                    </Stack>
                  }
                  secondary={n.message}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
