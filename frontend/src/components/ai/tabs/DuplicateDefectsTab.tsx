import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fetchProducts } from '../../../api/products';
import { findDuplicateDefects } from '../../../api/ai';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { DuplicateDefectsResult } from '../../../types/ai';

export function DuplicateDefectsTab() {
  const { currentProduct } = useProductContext();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DuplicateDefectsResult | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => {});
  }, []);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await findDuplicateDefects(productId));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Scans a product's defects for likely duplicates using a deterministic text-similarity heuristic --
        this does <strong>not</strong> call an external AI provider, so it works even without one
        configured. Results are candidates for a human to confirm; nothing is merged or closed automatically.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Product"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">Select a product…</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
          disabled={!productId || loading}
          onClick={handleScan}
        >
          Scan for Duplicates
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Scanned {result.totalDefectsScanned} defect(s), found {result.pairs.length} candidate pair(s)
            {result.truncated ? ' (showing top 25)' : ''}.
          </Typography>
          {result.pairs.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No likely duplicates found.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Defect A</TableCell>
                    <TableCell>Defect B</TableCell>
                    <TableCell align="right">Similarity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.pairs.map((pair, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{pair.defectATitle}</TableCell>
                      <TableCell>{pair.defectBTitle}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={`${pair.similarityPercent}%`} color={pair.similarityPercent >= 70 ? 'warning' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}
    </Box>
  );
}
