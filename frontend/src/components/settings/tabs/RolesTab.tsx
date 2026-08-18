import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { fetchRoles, fetchPermissionCatalog, updateRolePermissions } from '../../../api/roles';
import type { ApiRole, ApiPermission } from '../../../types/settings';

export function RolesTab() {
  const [roles, setRoles] = useState<ApiRole[] | null>(null);
  const [catalog, setCatalog] = useState<ApiPermission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {selectedRole.name}
            </Typography>
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
                      const locked = selectedRole.isSystem && permission.key === 'roles:manage';
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
    </Grid>
  );
}
