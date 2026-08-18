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
import { fetchProducts, updateProduct } from '../../../api/products';
import type { ApiProduct, ApiProductStatus } from '../../../types/product';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

export function ProductConfigTab() {
  const [products, setProducts] = useState<ApiProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiProduct | null>(null);

  const load = () => {
    setError(null);
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products.'));
  };

  useEffect(load, []);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {products === null && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {products && products.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No products found.</Typography>
        </Paper>
      )}
      {products && products.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Release</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.organization.name}</TableCell>
                  <TableCell>{product.environment}</TableCell>
                  <TableCell>{product.release}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[product.status] ?? product.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => setEditing(product)}>
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

      <ProductEditDialog product={editing} onClose={() => setEditing(null)} onSaved={load} />
    </Box>
  );
}

function ProductEditDialog({
  product,
  onClose,
  onSaved,
}: {
  product: ApiProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState('');
  const [release, setRelease] = useState('');
  const [status, setStatus] = useState<ApiProductStatus>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setDescription(product.description);
      setEnvironment(product.environment);
      setRelease(product.release);
      setStatus(product.status);
      setError(null);
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await updateProduct(product.id, { description, environment, release, status });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(product)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Product Configuration</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={product?.name ?? ''} disabled fullWidth />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            fullWidth
          />
          <TextField label="Release" value={release} onChange={(e) => setRelease(e.target.value)} fullWidth />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApiProductStatus)}
            fullWidth
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="ON_HOLD">On Hold</MenuItem>
            <MenuItem value="DEPRECATED">Deprecated</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
