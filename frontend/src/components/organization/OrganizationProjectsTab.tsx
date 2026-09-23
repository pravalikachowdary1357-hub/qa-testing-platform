import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { fetchProjects } from '../../api/projects';
import { ApiError } from '../../api/client';
import type { ApiProject, ProjectStatus } from '../../types/project';

const STATUS_LABELS: Record<string, ProjectStatus> = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

interface OrganizationProjectsTabProps {
  organizationId: string;
}

// Read-only: Project management itself lives on the Projects page. This
// mirrors the same "fetch all, filter to this scope" pattern the Projects/
// Products pages already use for their own Organization filter dropdowns.
export function OrganizationProjectsTab({ organizationId }: OrganizationProjectsTabProps) {
  const [projects, setProjects] = useState<ApiProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProjects(null);
    setError(null);
    fetchProjects()
      .then((data) => {
        if (!cancelled) setProjects(data.filter((p) => p.organizationId === organizationId));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load projects (HTTP ${err.status}).`
            : 'Failed to load projects. Is the backend running?',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (!projects && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  if (projects && projects.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No projects yet.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Business Unit</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Products</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects?.map((project) => (
            <TableRow key={project.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{project.name}</TableCell>
              <TableCell sx={{ color: 'text.secondary' }}>
                {project.businessUnit?.name ?? '—'}
              </TableCell>
              <TableCell>
                <StatusChip status={STATUS_LABELS[project.status]} />
              </TableCell>
              <TableCell align="right">{project._count.products}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
