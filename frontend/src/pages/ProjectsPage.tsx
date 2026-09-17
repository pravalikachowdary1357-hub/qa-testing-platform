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
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { ImportResultDialog } from '../components/common/ImportResultDialog';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';
import { ProjectFormDialog } from '../components/project/ProjectFormDialog';
import { ProjectDetailDialog } from '../components/project/ProjectDetailDialog';
import { DeleteProjectDialog } from '../components/project/DeleteProjectDialog';
import {
  createProject,
  deleteProject,
  fetchProjects,
  importProjects,
  updateProject,
} from '../api/projects';
import { fetchOrganizations } from '../api/organizations';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import type {
  ApiProject,
  ApiProjectStatus,
  CreateProjectPayload,
  ProjectStatus,
} from '../types/project';
import type { ApiOrganization } from '../types/organization';

const STATUS_LABELS: Record<ApiProjectStatus, ProjectStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

const ALL = 'ALL' as const;

export function ProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[] | null>(null);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiProjectStatus | typeof ALL>(ALL);
  const [organizationFilter, setOrganizationFilter] = useState<string | typeof ALL>(ALL);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState<ApiProject | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);

  const loadProjects = () => {
    setError(null);
    return fetchProjects()
      .then((data) => setProjects(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load projects (HTTP ${err.status}).`
            : 'Failed to load projects. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load projects (HTTP ${err.status}).`
            : 'Failed to load projects. Is the backend running?',
        );
      });

    fetchOrganizations()
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch(() => {
        // The organization list only feeds the create/edit dropdown and the
        // filter bar; a failure here surfaces naturally as "no organizations
        // available" rather than blocking the projects list itself.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (query && !project.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && project.status !== statusFilter) return false;
      if (organizationFilter !== ALL && project.organizationId !== organizationFilter) return false;
      return true;
    });
  }, [projects, searchQuery, statusFilter, organizationFilter]);

  const isLoading = projects === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== ALL || organizationFilter !== ALL;

  const handleCreateSubmit = async (data: CreateProjectPayload) => {
    await createProject(data);
    await loadProjects();
    setSnackbar({ message: 'Project created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateProjectPayload) => {
    if (!editingProject) return;
    await updateProject(editingProject.id, data);
    await loadProjects();
    setSnackbar({ message: 'Project updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    await deleteProject(deletingProject.id);
    await loadProjects();
    setSnackbar({ message: 'Project deleted.', severity: 'success' });
  };

  const handleImport = async (file: File) => {
    try {
      const result = await importProjects(file);
      setImportResult(result);
      await loadProjects();
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Import failed (HTTP ${err.status}).` : 'Import failed.',
        severity: 'error',
      });
    }
  };

  const handleExport = () => {
    exportToCsvWithAudit('Project', 'projects.csv', filteredProjects, [
      { header: 'Project Name', value: (p) => p.name },
      { header: 'Organization', value: (p) => p.organization.name },
      { header: 'Description', value: (p) => p.description },
      { header: 'Status', value: (p) => STATUS_LABELS[p.status] },
      { header: 'Created', value: (p) => new Date(p.createdAt).toLocaleDateString() },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Manage the projects that group products within an organization"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onImport={handleImport}
              onExport={handleExport}
              importDisabled={false}
              exportDisabled={!projects || projects.length === 0}
              importLabel="Import Projects"
              exportLabel="Export Projects"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormMode('create')}
            >
              Create Project
            </Button>
          </Stack>
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
            placeholder="Search projects by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 240 } }}
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
            label="Organization"
            value={organizationFilter}
            onChange={(e) => setOrganizationFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Organizations</MenuItem>
            {organizations.map((organization) => (
              <MenuItem key={organization.id} value={organization.id}>
                {organization.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiProjectStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {projects && projects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No projects found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Project
          </Button>
        </Paper>
      )}

      {projects && projects.length > 0 && filteredProjects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No projects match the current search/filters.'
              : 'No projects found.'}
          </Typography>
        </Paper>
      )}

      {filteredProjects.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {project.organization.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {project.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[project.status]} />
                  </TableCell>
                  <TableCell align="right">{project._count.products}</TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => setViewingProjectId(project.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingProject(project);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => setDeletingProject(project)}
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

      <ProjectFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        organizations={organizations}
        initialValues={
          formMode === 'edit' && editingProject
            ? {
                organizationId: editingProject.organizationId,
                name: editingProject.name,
                description: editingProject.description ?? '',
                status: editingProject.status,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingProject(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <ProjectDetailDialog
        projectId={viewingProjectId}
        onClose={() => setViewingProjectId(null)}
      />

      <DeleteProjectDialog
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
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
