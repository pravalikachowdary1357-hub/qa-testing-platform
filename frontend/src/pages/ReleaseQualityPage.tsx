import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
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
import GavelIcon from '@mui/icons-material/Gavel';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { StatusChip } from '../components/common/StatusChip';
import { ReleaseFormDialog, releaseToFormValues } from '../components/release/ReleaseFormDialog';
import { ReleaseDetailDialog } from '../components/release/ReleaseDetailDialog';
import { DeleteReleaseDialog } from '../components/release/DeleteReleaseDialog';
import { SignOffReleaseDialog } from '../components/release/SignOffReleaseDialog';
import {
  createRelease,
  deleteRelease,
  fetchReleases,
  signOffRelease,
  updateRelease,
} from '../api/release';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import {
  ALL_READINESS_VALUES,
  READINESS_LABELS,
  RELEASE_STATUS_LABELS,
} from '../types/release';
import type {
  ApiRelease,
  CreateReleasePayload,
  ReleaseReadiness,
  ReleaseStatus,
} from '../types/release';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';

type SortOption = 'newest' | 'name' | 'readiness' | 'passRate';

const STATUS_OPTIONS: ReleaseStatus[] = ['PLANNED', 'IN_TESTING', 'COMPLETED', 'APPROVED', 'REJECTED'];

const READINESS_RANK: Record<ReleaseReadiness, number> = {
  NOT_READY: 0,
  CONDITIONAL: 1,
  READY: 2,
};

const ALL = 'ALL' as const;

export function ReleaseQualityPage() {
  const { currentProduct } = useProductContext();
  const [releases, setReleases] = useState<ApiRelease[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | typeof ALL>(ALL);
  const [readinessFilter, setReadinessFilter] = useState<ReleaseReadiness | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingRelease, setEditingRelease] = useState<ApiRelease | null>(null);
  const [viewingRelease, setViewingRelease] = useState<ApiRelease | null>(null);
  const [deletingRelease, setDeletingRelease] = useState<ApiRelease | null>(null);
  const [signingOffRelease, setSigningOffRelease] = useState<ApiRelease | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const loadReleases = () => {
    setError(null);
    return fetchReleases(currentProduct?.id)
      .then((data) => setReleases(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load releases (HTTP ${err.status}).`
            : 'Failed to load releases. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setReleases(null);

    fetchReleases(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setReleases(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load releases (HTTP ${err.status}).`
            : 'Failed to load releases. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {});

    fetchEnvironments()
      .then((data) => {
        if (!cancelled) setEnvironments(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleReleases = useMemo(() => {
    if (!releases) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = releases.filter((release) => {
      if (
        query &&
        !release.name.toLowerCase().includes(query) &&
        !release.version.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (statusFilter !== ALL && release.status !== statusFilter) return false;
      if (readinessFilter !== ALL && release.quality.readiness !== readinessFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'readiness':
        sorted.sort((a, b) => READINESS_RANK[a.quality.readiness] - READINESS_RANK[b.quality.readiness]);
        break;
      case 'passRate':
        sorted.sort(
          (a, b) => a.quality.testExecutionSummary.passRatePercent - b.quality.testExecutionSummary.passRatePercent,
        );
        break;
    }
    return sorted;
  }, [releases, searchQuery, statusFilter, readinessFilter, sortBy]);

  const kpis = useMemo(() => {
    const counts = { total: 0, ready: 0, conditional: 0, notReady: 0, approved: 0 };
    for (const release of releases ?? []) {
      counts.total += 1;
      if (release.quality.readiness === 'READY') counts.ready += 1;
      if (release.quality.readiness === 'CONDITIONAL') counts.conditional += 1;
      if (release.quality.readiness === 'NOT_READY') counts.notReady += 1;
      if (release.status === 'APPROVED') counts.approved += 1;
    }
    return counts;
  }, [releases]);

  const isLoading = releases === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== ALL || readinessFilter !== ALL;

  const handleCreateSubmit = async (data: CreateReleasePayload) => {
    await createRelease(data);
    await loadReleases();
    setSnackbar({ message: 'Release created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateReleasePayload & { status?: ReleaseStatus }) => {
    if (!editingRelease) return;
    const { status, ...rest } = data;
    await updateRelease(editingRelease.id, {
      ...rest,
      status: status as 'PLANNED' | 'IN_TESTING' | 'COMPLETED' | undefined,
    });
    await loadReleases();
    setSnackbar({ message: 'Release updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRelease) return;
    await deleteRelease(deletingRelease.id);
    await loadReleases();
    setSnackbar({ message: 'Release deleted.', severity: 'success' });
  };

  const handleSignOffConfirm = async (data: Parameters<typeof signOffRelease>[1]) => {
    if (!signingOffRelease) return;
    await signOffRelease(signingOffRelease.id, data);
    await loadReleases();
    setSnackbar({
      message: data.decision === 'APPROVED' ? 'Release approved.' : 'Release rejected.',
      severity: 'success',
    });
  };

  return (
    <>
      <PageHeader
        title="Release Quality"
        subtitle="Track release readiness based on real test, defect, and quality-gate data"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Release
          </Button>
        }
      />

      {releases && releases.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <SummaryCard title="Releases" value={kpis.total} icon={RocketLaunchIcon} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <SummaryCard title="Ready" value={kpis.ready} icon={VerifiedIcon} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <SummaryCard title="Conditionally Ready" value={kpis.conditional} icon={WarningAmberIcon} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <SummaryCard title="Not Ready" value={kpis.notReady} icon={BlockIcon} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <SummaryCard title="Approved" value={kpis.approved} icon={HowToRegIcon} />
          </Grid>
        </Grid>
      )}

      {!isLoading && !error && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          useFlexGap
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          <TextField
            size="small"
            placeholder="Search by name or version…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 220 } }}
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
            onChange={(e) => setStatusFilter(e.target.value as ReleaseStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {RELEASE_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Readiness"
            value={readinessFilter}
            onChange={(e) => setReadinessFilter(e.target.value as ReleaseReadiness | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 180 } }}
          >
            <MenuItem value={ALL}>All Readiness</MenuItem>
            {ALL_READINESS_VALUES.map((readiness) => (
              <MenuItem key={readiness} value={readiness}>
                {READINESS_LABELS[readiness]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            sx={{ width: { xs: '100%', sm: 190 } }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="name">Name (A-Z)</MenuItem>
            <MenuItem value="readiness">Readiness (Not Ready-Ready)</MenuItem>
            <MenuItem value="passRate">Pass rate (Lowest first)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {releases && releases.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No releases found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Release
          </Button>
        </Paper>
      )}

      {releases && releases.length > 0 && visibleReleases.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters ? 'No releases match the current search/filters.' : 'No releases found.'}
          </Typography>
        </Paper>
      )}

      {visibleReleases.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Release</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Readiness</TableCell>
                <TableCell>Release Date</TableCell>
                <TableCell>Pass Rate</TableCell>
                <TableCell>Open Defects</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleReleases.map((release) => (
                <TableRow key={release.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {release.name} ({release.version})
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {release.product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={RELEASE_STATUS_LABELS[release.status]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={READINESS_LABELS[release.quality.readiness]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString() : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{release.quality.testExecutionSummary.passRatePercent}%</TableCell>
                  <TableCell>{release.quality.defects.openCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingRelease(release)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRelease(release);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sign Off">
                      <IconButton size="small" onClick={() => setSigningOffRelease(release)}>
                        <GavelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingRelease(release)}>
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

      <ReleaseFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        environments={environments}
        currentProductId={currentProduct?.id}
        initialValues={formMode === 'edit' && editingRelease ? releaseToFormValues(editingRelease) : undefined}
        onClose={() => {
          setFormMode(null);
          setEditingRelease(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <ReleaseDetailDialog release={viewingRelease} onClose={() => setViewingRelease(null)} />

      <DeleteReleaseDialog
        release={deletingRelease}
        onClose={() => setDeletingRelease(null)}
        onConfirm={handleDeleteConfirm}
      />

      <SignOffReleaseDialog
        release={signingOffRelease}
        onClose={() => setSigningOffRelease(null)}
        onConfirm={handleSignOffConfirm}
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
