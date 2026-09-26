import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  createRole,
  deleteRole,
  fetchRoles,
  fetchPermissionCatalog,
  updateRoleDetails,
  updateRolePermissions,
} from '../../../api/roles';
import { useAuth } from '../../../context/AuthContext';
import type { ApiRole, ApiPermission } from '../../../types/settings';

// Keys the protected System Administrator role must always keep (mirrors
// ADMIN_ESSENTIAL_KEYS in the backend RolesService).
const LOCKED_SYSTEM_KEYS = ['roles:read', 'roles:manage'];
const ROLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 &/().-]*$/;

function validateRoleName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Role name is required.';
  if (trimmed.length > 60) return 'Role name must be 60 characters or fewer.';
  if (!ROLE_NAME_PATTERN.test(trimmed)) {
    return 'Start with a letter; use only letters, numbers, spaces and & / ( ) . -';
  }
  return null;
}

function RoleDetailsDialog({
  open,
  role,
  roles,
  catalog,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: ApiRole | null;
  roles: ApiRole[];
  catalog: ApiPermission[];
  onClose: () => void;
  onSaved: (role: ApiRole) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setCopyFrom('');
    setError(null);
  }, [open, role]);

  const save = async () => {
    const nameError = validateRoleName(name);
    if (nameError) return setError(nameError);
    setSaving(true);
    setError(null);
    try {
      let saved: ApiRole;
      if (role) {
        saved = await updateRoleDetails(role.id, {
          ...(role.isSystem ? {} : { name: name.trim() }),
          description: description.trim(),
        });
      } else {
        const source = roles.find((r) => r.id === copyFrom);
        const keys = new Set(source?.permissions.map((p) => p.key) ?? []);
        saved = await createRole({
          name: name.trim(),
          description: description.trim() || undefined,
          permissionIds: catalog.filter((p) => keys.has(p.key)).map((p) => p.id),
        });
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Role name"
            required
            value={name}
            disabled={Boolean(role?.isSystem)}
            helperText={role?.isSystem ? 'The system role cannot be renamed.' : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Description"
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {!role && (
            <TextField
              select
              label="Start with permissions from"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              helperText="You can adjust the permissions after creating the role."
            >
              <MenuItem value="">No permissions</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {role ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function RolesTab() {
  const [roles, setRoles] = useState<ApiRole[] | null>(null);
  const [catalog, setCatalog] = useState<ApiPermission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useAuth();
  const canManage = hasPermission('roles:manage');
  const [dialogRole, setDialogRole] = useState<ApiRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiRole | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([fetchRoles(), fetchPermissionCatalog()])
      .then(([r, p]) => {
        setRoles(r);
        setCatalog(p);
        if (!selectedRoleId && r.length > 0) setSelectedRoleId(r[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load roles.'));
  };

  useEffect(load, []);

  const selectedRole = roles?.find((r) => r.id === selectedRoleId) ?? null;

  useEffect(() => {
    if (selectedRole) {
      setCheckedKeys(new Set(selectedRole.permissions.map((p) => p.key)));
      setSaveError(null);
    }
  }, [selectedRole]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ApiPermission[]>();
    for (const permission of catalog) {
      const list = groups.get(permission.resource) ?? [];
      list.push(permission);
      groups.set(permission.resource, list);
    }
    return groups;
  }, [catalog]);

  const isDirty =
    selectedRole &&
    (checkedKeys.size !== selectedRole.permissions.length ||
      selectedRole.permissions.some((p) => !checkedKeys.has(p.key)));

  const togglePermission = (permission: ApiPermission) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(permission.key)) next.delete(permission.key);
      else next.add(permission.key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setSaveError(null);
    try {
      const permissionIds = catalog.filter((p) => checkedKeys.has(p.key)).map((p) => p.id);
      const updated = await updateRolePermissions(selectedRole.id, permissionIds);
      setRoles((prev) => prev?.map((r) => (r.id === updated?.id ? (updated as ApiRole) : r)) ?? prev);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (selectedRole) setCheckedKeys(new Set(selectedRole.permissions.map((p) => p.key)));
    setSaveError(null);
  };

  const handleRoleSaved = (saved: ApiRole) => {
    setRoles((prev) => {
      if (!prev) return prev;
      return prev.some((r) => r.id === saved.id)
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [...prev, saved];
    });
    setSelectedRoleId(saved.id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id);
      setRoles((prev) => prev?.filter((r) => r.id !== deleteTarget.id) ?? prev);
      setSelectedRoleId(roles?.find((r) => r.id !== deleteTarget.id)?.id ?? null);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete role.');
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (roles === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 4, md: 3 }}>
        {canManage && (
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mb: 1.5 }}
            onClick={() => {
              setDialogRole(null);
              setDialogOpen(true);
            }}
          >
            Create Role
          </Button>
        )}
        <Paper variant="outlined">
          <List disablePadding>
            {roles.map((role) => (
              <ListItemButton
                key={role.id}
                selected={role.id === selectedRoleId}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <ListItemText
                  primary={role.name}
                  secondary={`${role.userCount} user(s)`}
                />
                {role.isSystem && <Chip label="System" size="small" />}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, sm: 8, md: 9 }}>
        {selectedRole && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                {selectedRole.name}
              </Typography>
              {canManage && (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    onClick={() => {
                      setDialogRole(selectedRole);
                      setDialogOpen(true);
                    }}
                  >
                    Edit details
                  </Button>
                  {!selectedRole.isSystem && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(selectedRole);
                      }}
                    >
                      Delete role
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
            {selectedRole.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedRole.description}
              </Typography>
            )}
            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {saveError}
              </Alert>
            )}
            <Stack spacing={2}>
              {[...grouped.entries()].map(([resource, permissions]) => (
                <Box key={resource}>
                  <Typography
                    variant="caption"
                    sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 600 }}
                  >
                    {resource.replace('_', ' ')}
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 3 }}>
                    {permissions.map((permission) => {
                      const locked = selectedRole.isSystem && LOCKED_SYSTEM_KEYS.includes(permission.key);
                      const control = (
                        <FormControlLabel
                          key={permission.id}
                          control={
                            <Checkbox
                              checked={checkedKeys.has(permission.key)}
                              disabled={locked}
                              onChange={() => togglePermission(permission)}
                            />
                          }
                          label={permission.description ?? permission.key}
                        />
                      );
                      return locked ? (
                        <Tooltip
                          key={permission.id}
                          title="A system role must always retain this permission."
                        >
                          <span>{control}</span>
                        </Tooltip>
                      ) : (
                        control
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
                Save
              </Button>
              <Button sx={{ ml: 1 }} onClick={handleCancel} disabled={!isDirty || saving}>
                Cancel
              </Button>
            </Box>
          </Paper>
        )}
      </Grid>

      <RoleDetailsDialog
        open={dialogOpen}
        role={dialogRole}
        roles={roles}
        catalog={catalog}
        onClose={() => setDialogOpen(false)}
        onSaved={handleRoleSaved}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete role?</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            Delete the role &ldquo;{deleteTarget?.name}&rdquo;? Roles that are still assigned to users cannot be
            deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
