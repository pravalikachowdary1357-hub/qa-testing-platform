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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { StatusChip } from '../common/StatusChip';
import {
  createBusinessUnit,
  deleteBusinessUnit,
  fetchBusinessUnits,
  updateBusinessUnit,
} from '../../api/businessUnits';
import { ApiError } from '../../api/client';
import { BUSINESS_UNIT_STATUS_LABELS } from '../../types/businessUnit';
import type { ApiBusinessUnit } from '../../types/businessUnit';
import type { ApiOrganizationStatus } from '../../types/organization';

interface BusinessUnitsTabProps {
  organizationId: string;
}

interface FormState {
  id: string | null;
  name: string;
  description: string;
  status: ApiOrganizationStatus;
}

const EMPTY_FORM: FormState = { id: null, name: '', description: '', status: 'ACTIVE' };

export function BusinessUnitsTab({ organizationId }: BusinessUnitsTabProps) {
  const [units, setUnits] = useState<ApiBusinessUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<ApiBusinessUnit | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchBusinessUnits(organizationId)
      .then(setUnits)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load business units (HTTP ${err.status}).`
            : 'Failed to load business units. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    setUnits(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleSubmit = async () => {
    if (!form) return;
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError('Business unit name is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (form.id) {
        await updateBusinessUnit(form.id, {
          name: trimmedName,
          description: form.description.trim() || undefined,
          status: form.status,
        });
        setSnackbar({ message: 'Business unit updated.', severity: 'success' });
      } else {
        await createBusinessUnit({
          organizationId,
          name: trimmedName,
          description: form.description.trim() || undefined,
          status: form.status,
        });
        setSnackbar({ message: 'Business unit created.', severity: 'success' });
      }
      setForm(null);
      void load();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save business unit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    setDeleteError(null);
    try {
      await deleteBusinessUnit(deleting.id);
      setDeleting(null);
      setSnackbar({ message: 'Business unit deleted.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete business unit.');
    } finally {
      setRemoving(false);
    }
  };

  const isLoading = units === null && !error;

  return (
    <Box>
      {!isLoading && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setNameError(null);
              setSubmitError(null);
            }}
          >
            Add Business Unit
          </Button>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {units && units.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ApartmentIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No business units yet.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setNameError(null);
              setSubmitError(null);
            }}
          >
            Add Business Unit
          </Button>
        </Paper>
      )}

      {units && units.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Projects</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{unit.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{unit.description ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={BUSINESS_UNIT_STATUS_LABELS[unit.status]} />
                  </TableCell>
                  <TableCell align="right">{unit._count.projects}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setForm({
                            id: unit.id,
                            name: unit.name,
                            description: unit.description ?? '',
                            status: unit.status,
                          });
                          setNameError(null);
                          setSubmitError(null);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleting(unit)}>
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

      <Dialog open={Boolean(form)} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? 'Edit Business Unit' : 'Add Business Unit'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Name"
              required
              fullWidth
              autoFocus
              value={form?.name ?? ''}
              error={Boolean(nameError)}
              helperText={nameError ?? ' '}
              onChange={(e) => {
                setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev));
                if (nameError) setNameError(null);
              }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form?.description ?? ''}
              onChange={(e) =>
                setForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
            />
            <TextField
              select
              label="Status"
              fullWidth
              value={form?.status ?? 'ACTIVE'}
              onChange={(e) =>
                setForm((prev) =>
                  prev ? { ...prev, status: e.target.value as ApiOrganizationStatus } : prev,
                )
              }
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForm(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {form?.id ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Business Unit</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <DialogContentText>
            Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be undone.
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
