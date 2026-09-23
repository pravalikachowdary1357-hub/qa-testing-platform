import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { ImportResultDialog } from '../components/common/ImportResultDialog';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';
import { OrganizationFormDialog } from '../components/organization/OrganizationFormDialog';
import { OrganizationDetailDialog } from '../components/organization/OrganizationDetailDialog';
import { DeleteOrganizationDialog } from '../components/organization/DeleteOrganizationDialog';
import {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  importOrganizations,
  updateOrganization,
} from '../api/organizations';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiOrganization,
  ApiOrganizationStatus,
  CreateOrganizationPayload,
  OrganizationStatus,
} from '../types/organization';

const STATUS_LABELS: Record<ApiOrganizationStatus, OrganizationStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export function OrganizationsPage() {
  const { currentProduct } = useProductContext();
  const [organizations, setOrganizations] = useState<ApiOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingOrganization, setEditingOrganization] = useState<ApiOrganization | null>(null);
  const [viewingOrganizationId, setViewingOrganizationId] = useState<string | null>(null);
  const [deletingOrganization, setDeletingOrganization] = useState<ApiOrganization | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);

  const loadOrganizations = () => {
    setError(null);
    return fetchOrganizations()
      .then((data) => setOrganizations(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load organizations (HTTP ${err.status}).`
            : 'Failed to load organizations. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;

    fetchOrganizations()
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load organizations (HTTP ${err.status}).`
            : 'Failed to load organizations. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const highlightedOrgId = currentProduct?.organizationId ?? null;

  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    const query = searchQuery.trim().toLowerCase();
    const matching = query
      ? organizations.filter((organization) => organization.name.toLowerCase().includes(query))
      : organizations;

    if (!highlightedOrgId) return matching;

    // Pin the organization that owns the currently selected product to the
    // top row, ahead of every other org, instead of leaving it wherever it
    // falls in the backend's natural (creation-order) list.
    const pinned = matching.filter((organization) => organization.id === highlightedOrgId);
    const rest = matching.filter((organization) => organization.id !== highlightedOrgId);
    return [...pinned, ...rest];
  }, [organizations, searchQuery, highlightedOrgId]);

  useEffect(() => {
    highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedOrgId, filteredOrganizations]);

  const isLoading = organizations === null && !error;

  const handleCreateSubmit = async (data: CreateOrganizationPayload) => {
    await createOrganization(data);
    await loadOrganizations();
    setSnackbar({ message: 'Organization created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateOrganizationPayload) => {
    if (!editingOrganization) return;
    await updateOrganization(editingOrganization.id, data);
    await loadOrganizations();
    setSnackbar({ message: 'Organization updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOrganization) return;
    await deleteOrganization(deletingOrganization.id);
    await loadOrganizations();
    setSnackbar({ message: 'Organization deleted.', severity: 'success' });
  };

  const handleImport = async (file: File) => {
    try {
      const result = await importOrganizations(file);
      setImportResult(result);
      await loadOrganizations();
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Import failed (HTTP ${err.status}).` : 'Import failed.',
        severity: 'error',
      });
    }
  };

  const handleExport = () => {
    exportToCsvWithAudit('Organization', 'organizations.csv', filteredOrganizations, [
      { header: 'Name', value: (o) => o.name },
      { header: 'Description', value: (o) => o.description },
      { header: 'Status', value: (o) => STATUS_LABELS[o.status] },
      { header: 'Created', value: (o) => new Date(o.createdAt).toLocaleDateString() },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="Manage the organizations that own products in this workspace"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onImport={handleImport}
              onExport={handleExport}
              importDisabled={false}
              exportDisabled={!organizations || organizations.length === 0}
              importLabel="Import Organizations"
              exportLabel="Export Organizations"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormMode('create')}
            >
              Create Organization
            </Button>
          </Stack>
        }
      />

      {!isLoading && !error && (
        <TextField
          size="small"
          placeholder="Search organizations by name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {organizations && organizations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No organizations found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Organization
          </Button>
        </Paper>
      )}

      {organizations && organizations.length > 0 && filteredOrganizations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No organizations match &ldquo;{searchQuery}&rdquo;.
          </Typography>
        </Paper>
      )}

      {filteredOrganizations.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrganizations.map((organization) => {
                const isHighlighted = organization.id === highlightedOrgId;
                return (
                <TableRow
                  key={organization.id}
                  hover
                  ref={isHighlighted ? highlightedRowRef : undefined}
                  selected={isHighlighted}
                  sx={isHighlighted ? { bgcolor: 'action.selected' } : undefined}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <span>{organization.name}</span>
                      {isHighlighted && (
                        <Chip label="Selected product's organization" size="small" color="primary" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {organization.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[organization.status]} />
                  </TableCell>
                  <TableCell align="right">{organization.productCount}</TableCell>
                  <TableCell>
                    {new Date(organization.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => setViewingOrganizationId(organization.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingOrganization(organization);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => setDeletingOrganization(organization)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <OrganizationFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        initialValues={
          formMode === 'edit' && editingOrganization
            ? {
                name: editingOrganization.name,
                orgKey: editingOrganization.orgKey ?? '',
                description: editingOrganization.description ?? '',
                status: editingOrganization.status,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingOrganization(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <OrganizationDetailDialog
        organizationId={viewingOrganizationId}
        onClose={() => setViewingOrganizationId(null)}
      />

      <DeleteOrganizationDialog
        organization={deletingOrganization}
        onClose={() => setDeletingOrganization(null)}
        onConfirm={handleDeleteConfirm}
      />

      <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />

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
    </>
  );
}
