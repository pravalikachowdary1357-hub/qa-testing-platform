import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { StatusChip } from '../../common/StatusChip';
import { OrganizationFormDialog } from '../../organization/OrganizationFormDialog';
import { DeleteOrganizationDialog } from '../../organization/DeleteOrganizationDialog';
import {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  updateOrganization,
} from '../../../api/organizations';
import { useAuth } from '../../../context/AuthContext';
import type { ApiOrganization } from '../../../types/organization';

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

// Platform administration of organizations (create / edit / delete). The
// Organization page itself stays a single-organization profile, as approved;
// this admin list lives only in Settings.
export function OrganizationsAdminTab() {
  const { user, hasPermission } = useAuth();
  const canWrite = hasPermission('organizations:write');
  const canDelete = hasPermission('organizations:manage');
  // Only a platform-level administrator (not assigned to an organization)
  // can create organizations; the backend enforces the same rule.
  const canCreate = canWrite && !user?.organizationId;

  const [organizations, setOrganizations] = useState<ApiOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApiOrganization | null>(null);
  const [deleting, setDeleting] = useState<ApiOrganization | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Memoised: the form dialog resets its fields whenever initialValues
  // changes identity, so a fresh object each render would wipe typing.
  const editValues = useMemo(
    () =>
      editing
        ? {
            name: editing.name,
            orgKey: editing.orgKey ?? '',
            description: editing.description ?? '',
            status: editing.status,
            orgReferenceId: editing.orgReferenceId ?? '',
            location: editing.location ?? '',
            establishedYear: editing.establishedYear ? String(editing.establishedYear) : '',
            email: editing.email ?? '',
          }
        : undefined,
    [editing],
  );

  const load = () => {
    setError(null);
    fetchOrganizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load organizations.'));
  };

  useEffect(load, []);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Organizations on this platform. Each organization&apos;s details, logo and documents are managed on its
          Organization page.
        </Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Create organization
          </Button>
        )}
      </Stack>

      {canWrite && user?.organizationId && (
        <Alert severity="info">
          You are assigned to an organization, so you can manage it but not create new organizations. Creating
          organizations is reserved for platform-level administrators.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {organizations === null && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {organizations && organizations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No organizations yet.</Typography>
        </Paper>
      )}
      {organizations && organizations.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Org ID</TableCell>
                <TableCell>Org Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell align="right">Users</TableCell>
                {(canWrite || canDelete) && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>{org.orgReferenceId ?? '—'}</TableCell>
                  <TableCell>{org.orgKey ?? '—'}</TableCell>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{org.location ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[org.status] ?? org.status} />
                  </TableCell>
                  <TableCell align="right">{org.productCount}</TableCell>
                  <TableCell align="right">{org.userCount}</TableCell>
                  {(canWrite || canDelete) && (
                    <TableCell align="right">
                      {canWrite && (
                        <Tooltip title="Edit">
                          <IconButton size="small" aria-label={`Edit ${org.name}`} onClick={() => setEditing(org)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Delete">
                          <IconButton size="small" aria-label={`Delete ${org.name}`} onClick={() => setDeleting(org)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <OrganizationFormDialog
        open={creating}
        mode="create"
        onClose={() => setCreating(false)}
        onSubmit={async (data) => {
          await createOrganization(data);
          setMessage(`Organization "${data.name}" created.`);
          load();
        }}
      />
      <OrganizationFormDialog
        open={Boolean(editing)}
        mode="edit"
        initialValues={editValues}
        onClose={() => setEditing(null)}
        onSubmit={async (data) => {
          if (!editing) return;
          await updateOrganization(editing.id, data);
          setMessage(`Organization "${data.name}" saved.`);
          load();
        }}
      />
      <DeleteOrganizationDialog
        organization={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteOrganization(deleting.id);
          setMessage(`Organization "${deleting.name}" deleted.`);
          load();
        }}
      />
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        message={message ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
