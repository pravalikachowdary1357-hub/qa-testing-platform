import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { OrganizationProfileTab } from './OrganizationProfileTab';
import { fetchOrganization, fetchOrganizations } from '../../api/organizations';
import { ApiError } from '../../api/client';
import { useProductContext } from '../../context/ProductContext';
import type { ApiOrganizationDetail } from '../../types/organization';

// Shared by the Organization page and Settings > Organization so both show
// the exact same profile: the organization owning the selected product,
// falling back to the first organization the user can see.
export function CurrentOrganizationProfile() {
  const { currentProduct } = useProductContext();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<ApiOrganizationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const describe = (err: unknown) =>
    err instanceof ApiError
      ? `Failed to load organization (HTTP ${err.status}).`
      : 'Failed to load organization. Is the backend running?';

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setEmpty(false);

    if (currentProduct?.organizationId) {
      setOrganizationId(currentProduct.organizationId);
      return;
    }

    fetchOrganizations()
      .then((list) => {
        if (cancelled) return;
        if (list.length === 0) {
          setEmpty(true);
          setOrganizationId(null);
        } else {
          setOrganizationId(list[0].id);
        }
      })
      .catch((err: unknown) => !cancelled && setError(describe(err)));

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.organizationId]);

  const loadOrganization = (id: string) =>
    fetchOrganization(id)
      .then(setOrganization)
      .catch((err: unknown) => setError(describe(err)));

  useEffect(() => {
    setOrganization(null);
    if (organizationId) void loadOrganization(organizationId);
  }, [organizationId]);

  if (error) return <Alert severity="error">{error}</Alert>;

  if (empty) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No organization found.</Typography>
      </Paper>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <OrganizationProfileTab
      organization={organization}
      onSaved={() => void loadOrganization(organization.id)}
    />
  );
}
