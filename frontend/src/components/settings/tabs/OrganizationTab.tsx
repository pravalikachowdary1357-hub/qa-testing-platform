import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
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
import EditIcon from '@mui/icons-material/Edit';
import { StatusChip } from '../../common/StatusChip';
import { fetchOrganizations, updateOrganization } from '../../../api/organizations';
import type { ApiOrganization } from '../../../types/organization';

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

export function OrganizationTab() {
  const [organizations, setOrganizations] = useState<ApiOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiOrganization | null>(null);

  const load = () => {
    setError(null);
    fetchOrganizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load organizations.'));
  };

  useEffect(load, []);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {organizations === null && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {organizations && organizations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No organizations found.</Typography>
        </Paper>
      )}
      {organizations && organizations.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{org.description ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[org.status] ?? org.status} />
                  </TableCell>
                  <TableCell align="right">{org.productCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => setEditing(org)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <OrganizationEditDialog organization={editing} onClose={() => setEditing(null)} onSaved={load} />
    </Box>
  );
}

function OrganizationEditDialog({
  organization,
  onClose,
  onSaved,
}: {
  organization: ApiOrganization | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setDescription(organization.description ?? '');
      setStatus(organization.status);
      setError(null);
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrganization(organization.id, { name, description, status });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save organization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(organization)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Organization</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            fullWidth
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
