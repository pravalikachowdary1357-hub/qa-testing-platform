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
  List,
  ListItem,
  ListItemText,
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
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  fetchTeam,
  fetchTeams,
  removeTeamMember,
} from '../../api/teams';
import { fetchUsers } from '../../api/users';
import { ApiError } from '../../api/client';
import type { ApiTeam, ApiTeamDetail } from '../../types/team';
import type { ApiUser } from '../../types/settings';

interface TeamsTabProps {
  organizationId: string;
}

export function TeamsTab({ organizationId }: TeamsTabProps) {
  const [teams, setTeams] = useState<ApiTeam[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleting, setDeleting] = useState<ApiTeam | null>(null);
  const [removing, setRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchTeams(organizationId)
      .then(setTeams)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load teams (HTTP ${err.status}).`
            : 'Failed to load teams. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    setTeams(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openAdd = () => {
    setName('');
    setDescription('');
    setNameError(null);
    setSubmitError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Team name is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createTeam({ organizationId, name: trimmed, description: description.trim() || undefined });
      setAddOpen(false);
      setSnackbar({ message: 'Team created.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    setDeleteError(null);
    try {
      await deleteTeam(deleting.id);
      setDeleting(null);
      setSnackbar({ message: 'Team deleted.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete team.');
    } finally {
      setRemoving(false);
    }
  };

  const isLoading = teams === null && !error;

  return (
    <Box>
      {!isLoading && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Team
          </Button>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {teams && teams.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <GroupsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No teams yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Team
          </Button>
        </Paper>
      )}

      {teams && teams.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{team.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{team.description ?? '—'}</TableCell>
                  <TableCell align="right">{team._count.members}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setViewingTeamId(team.id)}>
                      Manage Members
                    </Button>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleting(team)}>
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
        <DialogTitle>Add Team</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Name"
              required
              fullWidth
              autoFocus
              placeholder="e.g. QA Automation Team"
              value={name}
              error={Boolean(nameError)}
              helperText={nameError ?? ' '}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Team</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <DialogContentText>
            Are you sure you want to delete <strong>{deleting?.name}</strong>? This removes all of its
            members. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleting(null)} disabled={removing}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={removing}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <TeamMembersDialog
        teamId={viewingTeamId}
        organizationId={organizationId}
        onClose={() => setViewingTeamId(null)}
        onChanged={() => {
          void load();
        }}
      />

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

function TeamMembersDialog({
  teamId,
  organizationId,
  onClose,
  onChanged,
}: {
  teamId: string | null;
  organizationId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [team, setTeam] = useState<ApiTeamDetail | null>(null);
  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = () => {
    if (!teamId) return;
    fetchTeam(teamId)
      .then(setTeam)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load team (HTTP ${err.status}).`
            : 'Failed to load team. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setUsers(null);
      setError(null);
      setAddUserId('');
      setResponsibility('');
      setAddError(null);
      return;
    }
    load();
    // Scoped to this team's own organization -- otherwise the picker would
    // offer users from every organization, and nothing would stop adding one
    // of them onto this team (the backend independently enforces the same
    // boundary, but the picker shouldn't invite the mistake in the first place).
    fetchUsers({ organizationId }).then(setUsers).catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const memberUserIds = new Set(team?.members.map((m) => m.userId) ?? []);
  const availableUsers = (users ?? []).filter((u) => !memberUserIds.has(u.id));

  const handleAddMember = async () => {
    if (!teamId || !addUserId) {
      setAddError('Select a user to add.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await addTeamMember(teamId, {
        userId: addUserId,
        responsibility: responsibility.trim() || undefined,
      });
      setAddUserId('');
      setResponsibility('');
      load();
      onChanged();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!teamId) return;
    try {
      await removeTeamMember(teamId, memberId);
      load();
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  return (
    <Dialog open={Boolean(teamId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{team ? `${team.name} — Members` : 'Team Members'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!team && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {team && (
          <Stack spacing={2}>
            {team.members.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No members yet.
              </Typography>
            ) : (
              <List dense disablePadding>
                {team.members.map((member) => (
                  <ListItem
                    key={member.id}
                    disableGutters
                    secondaryAction={
                      <IconButton size="small" onClick={() => handleRemoveMember(member.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={member.user.name}
                      secondary={member.responsibility ?? member.user.email}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', pt: 1 }}>
              {addError && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  {addError}
                </Alert>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                select
                label="Add User"
                fullWidth
                size="small"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
              >
                {availableUsers.length === 0 ? (
                  <MenuItem value="" disabled>
                    No available users
                  </MenuItem>
                ) : (
                  availableUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))
                )}
              </TextField>
              <TextField
                label="Responsibility (optional)"
                size="small"
                fullWidth
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleAddMember}
                disabled={adding || !addUserId}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
