import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import {
  createProductTeamMember,
  deleteProductTeamMember,
  fetchProductTeamMembers,
} from '../../api/products';
import { fetchUsers } from '../../api/users';
import { ApiError } from '../../api/client';
import type { ApiProductTeamMember } from '../../types/product';
import type { ApiUser } from '../../types/settings';

interface ProductTeamTabProps {
  productId: string;
  organizationId: string;
}

export function ProductTeamTab({ productId, organizationId }: ProductTeamTabProps) {
  const [members, setMembers] = useState<ApiProductTeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingMember, setDeletingMember] = useState<ApiProductTeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchProductTeamMembers(productId)
      .then((data) => setMembers(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load team members (HTTP ${err.status}).`
            : 'Failed to load team members. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setMembers(null);
    setError(null);

    fetchProductTeamMembers(productId)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load team members (HTTP ${err.status}).`
            : 'Failed to load team members. Is the backend running?',
        );
      });

    // Scoped to the product's own organization so the picker only ever
    // offers users the backend will actually accept -- see
    // ProductTeamMembersService.create's matching organization check.
    fetchUsers({ organizationId })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        // Only feeds the "add member" picker; a failure here surfaces
        // naturally as an empty picker rather than blocking the team list.
      });

    return () => {
      cancelled = true;
    };
  }, [productId, organizationId]);

  const isLoading = members === null && !error;
  const availableUsers = users.filter((u) => !members?.some((m) => m.userId === u.id));

  const openAdd = () => {
    setUserId('');
    setResponsibility('');
    setUserError(null);
    setSubmitError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!userId) {
      setUserError('Select a user to add.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createProductTeamMember({
        productId,
        userId,
        responsibility: responsibility.trim() || undefined,
      });
      setMembers((prev) => (prev ? [...prev, created] : [created]));
      setAddOpen(false);
      setSnackbar({ message: 'Team member added.', severity: 'success' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add team member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProductTeamMember(deletingMember.id);
      setMembers((prev) => (prev ? prev.filter((m) => m.id !== deletingMember.id) : prev));
      setDeletingMember(null);
      setSnackbar({ message: 'Team member removed.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to remove team member.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Team Member
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {members && members.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <GroupOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No team members assigned yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Team Member
          </Button>
        </Paper>
      )}

      {members && members.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Responsibility</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{member.user.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{member.user.email}</TableCell>
                  <TableCell>{member.responsibility || '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => setDeletingMember(member)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              select
              label="User"
              required
              fullWidth
              value={userId}
              error={Boolean(userError)}
              helperText={
                userError ?? (availableUsers.length === 0 ? 'No more users available to add.' : ' ')
              }
              onChange={(e) => {
                setUserId(e.target.value);
                if (userError) setUserError(null);
              }}
            >
              {availableUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Responsibility (optional)"
              fullWidth
              placeholder="e.g. Lead Tester, QA Engineer"
              value={responsibility}
              onChange={(e) => setResponsibility(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting || availableUsers.length === 0}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingMember)} onClose={() => setDeletingMember(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Are you sure you want to remove <strong>{deletingMember?.user.name}</strong> from this
            product's team?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingMember(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
