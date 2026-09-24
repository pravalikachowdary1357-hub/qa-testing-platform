import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GroupsIcon from '@mui/icons-material/Groups';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import { StatusChip } from '../common/StatusChip';
import { SummaryCard } from '../common/SummaryCard';
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

const TABS = ['Organization Details', 'Business Units', 'Teams', 'Projects', 'Products', 'Users'] as const;

interface OrganizationDetailDialogProps {
  organizationId: string | null;
  onClose: () => void;
}

// A labeled field within the Organization Details panel -- keeps every
// field's label/value markup identical instead of repeating the same two
// Typography lines for each of the six profile fields.
function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
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
      <DialogTitle>Organization Profile</DialogTitle>
      <DialogContent>
        {!organization && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {organization && (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
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
              <Stack spacing={3}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Organization Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailField label="Organization Name" value={organization.name} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailField label="Organization Key" value={organization.orgKey || '—'} />
                    </Grid>
                    <Grid size={12}>
                      <DetailField
                        label="Description"
                        value={organization.description || 'No description provided.'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <DetailField
                        label="Status"
                        value={<StatusChip status={ORG_STATUS_LABELS[organization.status]} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <DetailField
                        label="Created At"
                        value={new Date(organization.createdAt).toLocaleString()}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <DetailField
                        label="Updated At"
                        value={new Date(organization.updatedAt).toLocaleString()}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Organization Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <SummaryCard
                        title="Business Units"
                        value={organization.businessUnitCount}
                        icon={ApartmentIcon}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <SummaryCard title="Teams" value={organization.teamCount} icon={GroupsIcon} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <SummaryCard
                        title="Projects"
                        value={organization.projectCount}
                        icon={FolderSpecialIcon}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <SummaryCard
                        title="Products"
                        value={organization.productCount}
                        icon={Inventory2Icon}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <SummaryCard title="Users" value={organization.userCount} icon={PeopleIcon} />
                    </Grid>
                  </Grid>
                </Box>
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
