import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { BusinessUnitsTab } from './BusinessUnitsTab';
import { TeamsTab } from './TeamsTab';
import { OrganizationProjectsTab } from './OrganizationProjectsTab';
import { OrganizationUsersTab } from './OrganizationUsersTab';
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

const TABS = ['Overview', 'Business Units', 'Teams', 'Projects', 'Products', 'Users'] as const;

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
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!organizationId) {
      setOrganization(null);
      setError(null);
      setActiveTab(0);
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
    <Dialog open={Boolean(organizationId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Organization Workspace</DialogTitle>
      <DialogContent>
        {!organization && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {organization && (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">{organization.name}</Typography>
              {organization.orgKey && <Chip size="small" label={organization.orgKey} />}
              <StatusChip status={ORG_STATUS_LABELS[organization.status]} />
            </Stack>

            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              {TABS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>

            {activeTab === 0 && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body2">
                    {organization.description || 'No description provided.'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Business Units
                    </Typography>
                    <Typography variant="h6">{organization.businessUnitCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Projects
                    </Typography>
                    <Typography variant="h6">{organization.projectCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Products
                    </Typography>
                    <Typography variant="h6">{organization.productCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Teams
                    </Typography>
                    <Typography variant="h6">{organization.teamCount}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Users
                    </Typography>
                    <Typography variant="h6">{organization.userCount}</Typography>
                  </Box>
                </Stack>

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
              </Stack>
            )}

            {activeTab === 1 && <BusinessUnitsTab organizationId={organization.id} />}
            {activeTab === 2 && <TeamsTab organizationId={organization.id} />}
            {activeTab === 3 && <OrganizationProjectsTab organizationId={organization.id} />}
            {activeTab === 4 &&
              (organization.products.length === 0 ? (
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
              ))}
            {activeTab === 5 && <OrganizationUsersTab organizationId={organization.id} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
