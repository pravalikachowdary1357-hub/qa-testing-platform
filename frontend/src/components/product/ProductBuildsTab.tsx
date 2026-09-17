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
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import { StatusChip } from '../common/StatusChip';
import { createBuild, deleteBuild, fetchBuilds } from '../../api/builds';
import { fetchReleases } from '../../api/release';
import { ApiError } from '../../api/client';
import type { ApiBuild, ApiBuildStatus } from '../../types/build';
import { BUILD_STATUS_LABELS } from '../../types/build';
import type { ApiRelease } from '../../types/release';

const STATUS_OPTIONS = Object.entries(BUILD_STATUS_LABELS) as [ApiBuildStatus, string][];

interface ProductBuildsTabProps {
  productId: string;
}

export function ProductBuildsTab({ productId }: ProductBuildsTabProps) {
  const [builds, setBuilds] = useState<ApiBuild[] | null>(null);
  const [releases, setReleases] = useState<ApiRelease[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [releaseId, setReleaseId] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [buildDate, setBuildDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ApiBuildStatus>('PENDING');
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [buildNumberError, setBuildNumberError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingBuild, setDeletingBuild] = useState<ApiBuild | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchBuilds(productId)
      .then((data) => setBuilds(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load builds (HTTP ${err.status}).`
            : 'Failed to load builds. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setBuilds(null);
    setReleases(null);
    setError(null);

    fetchBuilds(productId)
      .then((data) => {
        if (!cancelled) setBuilds(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load builds (HTTP ${err.status}).`
            : 'Failed to load builds. Is the backend running?',
        );
      });

    fetchReleases(productId)
      .then((data) => {
        if (!cancelled) setReleases(data);
      })
      .catch(() => {
        if (!cancelled) setReleases([]);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const isLoading = (builds === null || releases === null) && !error;
  const hasReleases = (releases?.length ?? 0) > 0;

  const openAdd = () => {
    setReleaseId('');
    setBuildNumber('');
    setBuildDate('');
    setNotes('');
    setStatus('PENDING');
    setReleaseError(null);
    setBuildNumberError(null);
    setSubmitError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!releaseId) {
      setReleaseError('Release is required.');
      return;
    }
    const trimmed = buildNumber.trim();
    if (!trimmed) {
      setBuildNumberError('Build number is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createBuild({
        releaseId,
        buildNumber: trimmed,
        buildDate: buildDate || undefined,
        notes: notes.trim() || undefined,
        status,
      });
      setBuilds((prev) => (prev ? [...prev, created] : [created]));
      setAddOpen(false);
      setSnackbar({ message: 'Build added.', severity: 'success' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add build.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBuild) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteBuild(deletingBuild.id);
      setBuilds((prev) => (prev ? prev.filter((b) => b.id !== deletingBuild.id) : prev));
      setDeletingBuild(null);
      setSnackbar({ message: 'Build removed.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to remove build.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {!isLoading && hasReleases && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Build
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
          <ConstructionOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No releases yet. Create a release for this product before adding builds.
          </Typography>
        </Paper>
      )}

      {builds && builds.length === 0 && hasReleases && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ConstructionOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No builds yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Build
          </Button>
        </Paper>
      )}

      {builds && builds.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Build</TableCell>
                <TableCell>Release</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Build Date</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {builds.map((build) => (
                <TableRow key={build.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{build.buildNumber}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {build.release.name} ({build.release.version})
                  </TableCell>
                  <TableCell>
                    <StatusChip status={BUILD_STATUS_LABELS[build.status]} />
                  </TableCell>
                  <TableCell>
                    {build.buildDate ? new Date(build.buildDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {build.notes || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => setDeletingBuild(build)}>
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
        <DialogTitle>Add Build</DialogTitle>
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
              label="Build Number"
              required
              fullWidth
              placeholder="e.g. 2.5.101"
              value={buildNumber}
              error={Boolean(buildNumberError)}
              helperText={buildNumberError ?? ' '}
              onChange={(e) => {
                setBuildNumber(e.target.value);
                if (buildNumberError) setBuildNumberError(null);
              }}
            />
            <TextField
              label="Build Date"
              type="date"
              fullWidth
              value={buildDate}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => setBuildDate(e.target.value)}
            />
            <TextField
              select
              label="Status"
              fullWidth
              value={status}
              onChange={(e) => setStatus(e.target.value as ApiBuildStatus)}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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

      <Dialog open={Boolean(deletingBuild)} onClose={() => setDeletingBuild(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remove Build</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Are you sure you want to remove <strong>{deletingBuild?.buildNumber}</strong>? This
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingBuild(null)} disabled={deleting}>
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
