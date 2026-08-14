import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { RequirementFormDialog } from '../components/requirement/RequirementFormDialog';
import { RequirementDetailDialog } from '../components/requirement/RequirementDetailDialog';
import { DeleteRequirementDialog } from '../components/requirement/DeleteRequirementDialog';
import {
  createRequirement,
  deleteRequirement,
  fetchRequirements,
  updateRequirement,
} from '../api/requirements';
import { fetchProducts } from '../api/products';
import { ApiError } from '../api/client';
import type {
  ApiRequirement,
  ApiRequirementPriority,
  ApiRequirementStatus,
  ApiRequirementType,
  CreateRequirementPayload,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from '../types/requirement';
import type { ApiProduct } from '../types/product';

const TYPE_LABELS: Record<ApiRequirementType, RequirementType> = {
  FUNCTIONAL: 'Functional',
  NON_FUNCTIONAL: 'Non-Functional',
  BUSINESS: 'Business',
  TECHNICAL: 'Technical',
};

const PRIORITY_LABELS: Record<ApiRequirementPriority, RequirementPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<ApiRequirementStatus, RequirementStatus> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

const PRIORITY_RANK: Record<ApiRequirementPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortOption = 'newest' | 'oldest' | 'priority' | 'title';

const ALL = 'ALL' as const;

export function RequirementsPage() {
  const [requirements, setRequirements] = useState<ApiRequirement[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiRequirementStatus | typeof ALL>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<ApiRequirementPriority | typeof ALL>(ALL);
  const [typeFilter, setTypeFilter] = useState<ApiRequirementType | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingRequirement, setEditingRequirement] = useState<ApiRequirement | null>(null);
  const [viewingRequirementId, setViewingRequirementId] = useState<string | null>(null);
  const [deletingRequirement, setDeletingRequirement] = useState<ApiRequirement | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadRequirements = () => {
    setError(null);
    return fetchRequirements()
      .then((data) => setRequirements(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load requirements (HTTP ${err.status}).`
            : 'Failed to load requirements. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;

    fetchRequirements()
      .then((data) => {
        if (!cancelled) setRequirements(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load requirements (HTTP ${err.status}).`
            : 'Failed to load requirements. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        // The product list only feeds the create/edit dropdown; a failure
        // here surfaces naturally as "no products available" in the form
        // rather than blocking the requirements list itself.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRequirements = useMemo(() => {
    if (!requirements) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = requirements.filter((requirement) => {
      if (query && !requirement.title.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && requirement.status !== statusFilter) return false;
      if (priorityFilter !== ALL && requirement.priority !== priorityFilter) return false;
      if (typeFilter !== ALL && requirement.type !== typeFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'priority':
        sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [requirements, searchQuery, statusFilter, priorityFilter, typeFilter, sortBy]);

  const isLoading = requirements === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== ALL || priorityFilter !== ALL || typeFilter !== ALL;

  const handleCreateSubmit = async (data: CreateRequirementPayload) => {
    await createRequirement(data);
    await loadRequirements();
    setSnackbar({ message: 'Requirement created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateRequirementPayload) => {
    if (!editingRequirement) return;
    await updateRequirement(editingRequirement.id, data);
    await loadRequirements();
    setSnackbar({ message: 'Requirement updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRequirement) return;
    await deleteRequirement(deletingRequirement.id);
    await loadRequirements();
    setSnackbar({ message: 'Requirement deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Requirements"
        subtitle="Track functional and non-functional requirements across products"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Requirement
          </Button>
        }
      />

      {!isLoading && !error && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          useFlexGap
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          <TextField
            size="small"
            placeholder="Search requirements by title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 260 } }}
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
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiRequirementStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ApiRequirementPriority | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Priorities</MenuItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ApiRequirementType | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Types</MenuItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="priority">Priority (High-Low)</MenuItem>
            <MenuItem value="title">Title (A-Z)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {requirements && requirements.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No requirements found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Requirement
          </Button>
        </Paper>
      )}

      {requirements && requirements.length > 0 && visibleRequirements.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No requirements match the current search/filters.'
              : 'No requirements found.'}
          </Typography>
        </Paper>
      )}

      {visibleRequirements.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRequirements.map((requirement) => (
                <TableRow key={requirement.id} hover>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" noWrap>
                      {requirement.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {requirement.product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[requirement.type]}</TableCell>
                  <TableCell>
                    <StatusChip status={PRIORITY_LABELS[requirement.priority]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[requirement.status]} />
                  </TableCell>
                  <TableCell>{new Date(requirement.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => setViewingRequirementId(requirement.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRequirement(requirement);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => setDeletingRequirement(requirement)}
                      >
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

      <RequirementFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        initialValues={
          formMode === 'edit' && editingRequirement
            ? {
                productId: editingRequirement.productId,
                title: editingRequirement.title,
                description: editingRequirement.description,
                type: editingRequirement.type,
                priority: editingRequirement.priority,
                status: editingRequirement.status,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingRequirement(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <RequirementDetailDialog
        requirementId={viewingRequirementId}
        onClose={() => setViewingRequirementId(null)}
      />

      <DeleteRequirementDialog
        requirement={deletingRequirement}
        onClose={() => setDeletingRequirement(null)}
        onConfirm={handleDeleteConfirm}
      />

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
