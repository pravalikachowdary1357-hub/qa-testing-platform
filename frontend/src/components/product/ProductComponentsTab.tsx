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
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import {
  createProductComponent,
  deleteProductComponent,
  fetchProductComponents,
} from '../../api/products';
import { ApiError } from '../../api/client';
import type { ApiProductComponent } from '../../types/product';

interface ProductComponentsTabProps {
  productId: string;
}

export function ProductComponentsTab({ productId }: ProductComponentsTabProps) {
  const [components, setComponents] = useState<ApiProductComponent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingComponent, setDeletingComponent] = useState<ApiProductComponent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const load = () => {
    setError(null);
    return fetchProductComponents(productId)
      .then((data) => setComponents(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load components (HTTP ${err.status}).`
            : 'Failed to load components. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setComponents(null);
    setError(null);

    fetchProductComponents(productId)
      .then((data) => {
        if (!cancelled) setComponents(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load components (HTTP ${err.status}).`
            : 'Failed to load components. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const isLoading = components === null && !error;

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
      setNameError('Component name is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createProductComponent({
        productId,
        name: trimmed,
        description: description.trim() || undefined,
      });
      setComponents((prev) => (prev ? [...prev, created] : [created]));
      setAddOpen(false);
      setSnackbar({ message: 'Component added.', severity: 'success' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add component.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingComponent) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProductComponent(deletingComponent.id);
      setComponents((prev) => (prev ? prev.filter((c) => c.id !== deletingComponent.id) : prev));
      setDeletingComponent(null);
      setSnackbar({ message: 'Component removed.', severity: 'success' });
      void load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to remove component.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Add Component
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {components && components.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <ViewModuleOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No components or modules defined yet.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Component
          </Button>
        </Paper>
      )}

      {components && components.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {components.map((component) => (
                <TableRow key={component.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{component.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {component.description || '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => setDeletingComponent(component)}>
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
        <DialogTitle>Add Component</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Name"
              required
              fullWidth
              autoFocus
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
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingComponent)} onClose={() => setDeletingComponent(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remove Component</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Are you sure you want to remove <strong>{deletingComponent?.name}</strong>? This cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingComponent(null)} disabled={deleting}>
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
