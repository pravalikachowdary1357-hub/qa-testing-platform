import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { StatusChip } from '../../common/StatusChip';
import { fetchUsers, createUser, updateUser, updateUserStatus } from '../../../api/users';
import { fetchRoles } from '../../../api/roles';
import { UserFormDialog } from '../UserFormDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import type { ApiUser, ApiRole } from '../../../types/settings';

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

export function UsersTab() {
  const { user: currentUser, hasPermission } = useAuth();
  const canManage = hasPermission('users:manage');

  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<ApiUser | null>(null);

  const loadUsers = () => {
    setError(null);
    fetchUsers({
      search: search || undefined,
      roleId: roleFilter || undefined,
      status: statusFilter || undefined,
    })
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users.'));
  };

  useEffect(loadUsers, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch((err) => setRolesError(err instanceof Error ? err.message : 'Failed to load roles.'));
  }, []);

  const isLoading = users === null && !error;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {rolesError && canManage && <Alert severity="warning" sx={{ mb: 2 }}>{rolesError}</Alert>}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2, alignItems: 'center' }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
        <TextField
          select
          size="small"
          label="Role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ width: 180 }}
        >
          <MenuItem value="">All Roles</MenuItem>
          {roles.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 160 }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INACTIVE">Inactive</MenuItem>
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        {canManage && (
          <Button
            variant="contained"
            disabled={roles.length === 0}
            onClick={() => setDialogMode('create')}
          >
            Create User
          </Button>
        )}
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {users && users.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No users found.</Typography>
        </Paper>
      )}
      {users && users.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      {user.name}
                      {isSelf && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {' '}
                          (you)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role.name}</TableCell>
                    <TableCell>
                      <StatusChip status={STATUS_LABELS[user.status] ?? user.status} />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Tooltip title="Edit role/name">
                          <span>
                            <Button
                              size="small"
                              disabled={isSelf}
                              onClick={() => {
                                setEditingUser(user);
                                setDialogMode('edit');
                              }}
                            >
                              Edit
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            isSelf
                              ? 'You cannot activate or deactivate your own account.'
                              : user.status === 'ACTIVE'
                                ? 'Deactivate'
                                : 'Activate'
                          }
                        >
                          <span>
                            <Switch
                              size="small"
                              checked={user.status === 'ACTIVE'}
                              disabled={isSelf}
                              onChange={() => setStatusTarget(user)}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserFormDialog
        open={dialogMode !== null}
        mode={dialogMode ?? 'create'}
        user={editingUser}
        roles={roles}
        onClose={() => {
          setDialogMode(null);
          setEditingUser(null);
        }}
        onSubmit={async (values) => {
          if (dialogMode === 'create') {
            await createUser(values);
          } else if (editingUser) {
            await updateUser(editingUser.id, { name: values.name, roleId: values.roleId });
          }
          loadUsers();
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
        message={
          statusTarget?.status === 'ACTIVE'
            ? `Deactivating ${statusTarget?.name} will immediately prevent them from signing in.`
            : `${statusTarget?.name} will be able to sign in again.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmColor={statusTarget?.status === 'ACTIVE' ? 'error' : 'primary'}
        onClose={() => setStatusTarget(null)}
        onConfirm={async () => {
          if (statusTarget) {
            await updateUserStatus(
              statusTarget.id,
              statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
            );
            loadUsers();
          }
        }}
      />
    </Box>
  );
}
