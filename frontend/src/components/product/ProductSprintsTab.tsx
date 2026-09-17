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
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import { StatusChip } from '../common/StatusChip';
import { createSprint, deleteSprint, fetchSprints } from '../../api/sprints';
import { fetchReleases } from '../../api/release';
import { ApiError } from '../../api/client';
import type { ApiSprint, ApiSprintStatus } from '../../types/sprint';
import { SPRINT_STATUS_LABELS } from '../../types/sprint';
import type { ApiRelease } from '../../types/release';

const STATUS_OPTIONS = Object.entries(SPRINT_STATUS_LABELS) as [ApiSprintStatus, string][];

interface ProductSprintsTabProps {
  productId: string;
}

export function ProductSprintsTab({ productId }: ProductSprintsTabProps) {
  const [sprints, setSprints] = useState<ApiSprint[] | null>(null);
  const [releases, setReleases] = useState<ApiRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [releaseId, setReleaseId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ApiSprintStatus>('PLANNED');
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSprint, setDeletingSprint] = useState<ApiSprint | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchSprints(productId)
      .then((data) => setSprints(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load sprints (HTTP ${err.status}).`
            : 'Failed to load sprints. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setSprints(null);
    setReleases(null);
    setError(null);

    fetchSprints(productId)
      .then((data) => {
        if (!cancelled) setSprints(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load sprints (HTTP ${err.status}).`
            : 'Failed to load sprints. Is the backend running?',
        );
      });

    fetchReleases(productId)
      .then((data) => {
        if (!cancelled) setReleases(data);
      })
      .catch(() => {
        // Only feeds the Release picker in the add dialog; a failure here
        // surfaces naturally as "no releases available" rather than
        // blocking the sprint list itself.
        if (!cancelled) setReleases([]);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const isLoading = (sprints === null || releases === null) && !error;
  const hasReleases = (releases?.length ?? 0) > 0;

  const openAdd = () => {
    setReleaseId('');
    setName('');
    setStartDate('');
    setEndDate('');
    setStatus('PLANNED');
    setReleaseError(null);
    setNameError(null);
    setSubmitError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!releaseId) {
      setReleaseError('Release is required.');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Sprint name is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createSprint({
        releaseId,
        name: trimmed,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
      });
      setSprints((prev) => (prev ? [...prev, created] : [created]));
      setAddOpen(false);
      setSnackbar({ message: 'Sprint added.', severity: 'success' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add sprint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSprint) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSprint(deletingSprint.id);
      setSprints((prev) => (prev ? prev.filter((s) => s.id !== deletingSprint.id) : prev));
      setDeletingSprint(null);
      setSnackbar({ message: 'Sprint removed.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to remove sprint.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {!isLoading && hasReleases && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Sprint
          </Button>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!isLoading && !error && !hasReleases && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <EventRepeatOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No releases yet. Create a release for this product before adding sprints.
          </Typography>
        </Paper>
      )}

      {sprints && sprints.length === 0 && hasReleases && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <EventRepeatOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No sprints yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Sprint
          </Button>
        </Paper>
      )}

      {sprints && sprints.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sprint</TableCell>
                <TableCell>Release</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sprints.map((sprint) => (
                <TableRow key={sprint.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{sprint.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {sprint.release.name} ({sprint.release.version})
                  </TableCell>
                  <TableCell>
                    <StatusChip status={SPRINT_STATUS_LABELS[sprint.status]} />
                  </TableCell>
                  <TableCell>
                    {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => setDeletingSprint(sprint)}>
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
        <DialogTitle>Add Sprint</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              select
              label="Release"
              required
              fullWidth
              value={releaseId}
              error={Boolean(releaseError)}
              helperText={releaseError ?? ' '}
              onChange={(e) => {
                setReleaseId(e.target.value);
                if (releaseError) setReleaseError(null);
              }}
            >
              {(releases ?? []).map((release) => (
                <MenuItem key={release.id} value={release.id}>
                  {release.name} ({release.version})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Name"
              required
              fullWidth
              placeholder="e.g. Sprint 21"
              value={name}
              error={Boolean(nameError)}
              helperText={nameError ?? ' '}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
            />
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={startDate}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={endDate}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <TextField
              select
              label="Status"
              fullWidth
              value={status}
              onChange={(e) => setStatus(e.target.value as ApiSprintStatus)}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAdd} disabled={submitting}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingSprint)} onClose={() => setDeletingSprint(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remove Sprint</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Are you sure you want to remove <strong>{deletingSprint?.name}</strong>? This cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingSprint(null)} disabled={deleting}>
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
