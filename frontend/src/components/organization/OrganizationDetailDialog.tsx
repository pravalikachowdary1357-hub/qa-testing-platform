import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { fetchOrganization } from '../../api/organizations';
import { ApiError } from '../../api/client';
import type { ApiOrganizationDetail, OrganizationStatus } from '../../types/organization';
import type { ProductStatus } from '../../types/product';

const ORG_STATUS_LABELS: Record<string, OrganizationStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

const PRODUCT_STATUS_LABELS: Record<string, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

interface OrganizationDetailDialogProps {
  organizationId: string | null;
  onClose: () => void;
}

export function OrganizationDetailDialog({
  organizationId,
  onClose,
}: OrganizationDetailDialogProps) {
  const [organization, setOrganization] = useState<ApiOrganizationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setOrganization(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setOrganization(null);
    setError(null);

    fetchOrganization(organizationId)
      .then((data) => {
        if (!cancelled) setOrganization(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load organization (HTTP ${err.status}).`
            : 'Failed to load organization. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <Dialog open={Boolean(organizationId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Organization Details</DialogTitle>
      <DialogContent>
        {!organization && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {organization && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{organization.name}</Typography>
              <StatusChip status={ORG_STATUS_LABELS[organization.status]} />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2">
                {organization.description || 'No description provided.'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(organization.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(organization.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Products ({organization.productCount})
              </Typography>
              {organization.products.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No products belong to this organization yet.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {organization.products.map((product) => (
                    <ListItem key={product.id} disableGutters>
                      <ListItemText primary={product.name} />
                      <StatusChip status={PRODUCT_STATUS_LABELS[product.status]} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
