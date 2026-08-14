import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { fetchProduct } from '../../api/products';
import { ApiError } from '../../api/client';
import type { ApiProduct, ProductStatus, ReleaseReadiness } from '../../types/product';

const STATUS_LABELS: Record<string, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

const READINESS_LABELS: Record<string, ReleaseReadiness> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditional',
  NOT_READY: 'Not Ready',
};

interface ProductDetailDialogProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailDialog({ productId, onClose }: ProductDetailDialogProps) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setProduct(null);
    setError(null);

    fetchProduct(productId)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load product (HTTP ${err.status}).`
            : 'Failed to load product. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <Dialog open={Boolean(productId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Product Details</DialogTitle>
      <DialogContent>
        {!product && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {product && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{product.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {product.organization.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={STATUS_LABELS[product.status]} />
              <StatusChip status={READINESS_LABELS[product.releaseReadiness]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {product.description}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Environment
                </Typography>
                <Typography variant="body2">{product.environment}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Release
                </Typography>
                <Typography variant="body2">{product.release}</Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Test Coverage
                </Typography>
                <Typography variant="body2">{product.testCoverage}%</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Pass Rate
                </Typography>
                <Typography variant="body2">{product.passRate}%</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Open Defects
                </Typography>
                <Typography variant="body2">{product.openDefects}</Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(product.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(product.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
