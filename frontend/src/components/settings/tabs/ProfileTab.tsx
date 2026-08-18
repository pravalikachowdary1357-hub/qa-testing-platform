import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { updateOwnProfile } from '../../../api/users';
import { changePassword, fetchSessions, revokeSession } from '../../../api/auth';
import { ConfirmDialog } from '../ConfirmDialog';
import type { ApiSession } from '../../../types/auth';

export function ProfileTab() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [notifications, setNotifications] = useState(user?.emailNotificationsEnabled ?? true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [sessions, setSessions] = useState<ApiSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiSession | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setNotifications(user?.emailNotificationsEnabled ?? true);
  }, [user]);

  const loadSessions = () => {
    setSessionsError(null);
    fetchSessions()
      .then(setSessions)
      .catch((err) => setSessionsError(err instanceof Error ? err.message : 'Failed to load sessions.'));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await updateOwnProfile({ name, emailNotificationsEnabled: notifications });
      await refresh();
      setProfileSuccess(true);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Profile
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {profileError && <Alert severity="error">{profileError}</Alert>}
          {profileSuccess && <Alert severity="success">Profile updated.</Alert>}
          <TextField label="Email" value={user.email} disabled fullWidth />
          <TextField label="Role" value={user.roleName} disabled fullWidth />
          <TextField
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setProfileSuccess(false);
            }}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={(e) => {
                  setNotifications(e.target.checked);
                  setProfileSuccess(false);
                }}
              />
            }
            label="Email notifications enabled"
          />
          <Box>
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              disabled={savingProfile || !name.trim()}
            >
              Save
            </Button>
            <Button
              sx={{ ml: 1 }}
              onClick={() => {
                setName(user.name);
                setNotifications(user.emailNotificationsEnabled);
                setProfileError(null);
                setProfileSuccess(false);
              }}
              disabled={savingProfile}
            >
              Cancel
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Change Password
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {passwordError && <Alert severity="error">{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success">Password changed.</Alert>}
          <TextField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />
          <Box>
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword}
            >
              Change Password
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Active Sessions
        </Typography>
        {sessionsError && <Alert severity="error">{sessionsError}</Alert>}
        {sessions === null && !sessionsError && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {sessions && sessions.length === 0 && (
          <Typography color="text.secondary">No active sessions.</Typography>
        )}
        {sessions && sessions.length > 0 && (
          <Stack spacing={1.5} divider={<Divider />}>
            {sessions.map((session) => (
              <Stack
                key={session.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2">
                      {session.userAgent ?? 'Unknown device'}
                    </Typography>
                    {session.current && <Chip label="This device" size="small" color="success" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Last used {new Date(session.lastUsedAt).toLocaleString()}
                  </Typography>
                </Box>
                {!session.current && (
                  <Button size="small" color="error" onClick={() => setRevoking(session)}>
                    Sign out
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        )}
        <Divider sx={{ my: 2 }} />
        <Button variant="outlined" color="error" onClick={handleSignOut}>
          Sign out of this device
        </Button>
      </Paper>

      <ConfirmDialog
        open={Boolean(revoking)}
        title="Sign out device"
        message="This will immediately end that session. Continue?"
        confirmLabel="Sign out"
        confirmColor="error"
        onClose={() => setRevoking(null)}
        onConfirm={async () => {
          if (revoking) {
            await revokeSession(revoking.id);
            loadSessions();
          }
        }}
      />
    </Stack>
  );
}
