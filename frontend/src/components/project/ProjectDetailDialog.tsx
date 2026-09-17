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
import { fetchProject } from '../../api/projects';
import { ApiError } from '../../api/client';
import type { ApiProjectDetail, ProjectStatus } from '../../types/project';
import type { ProductStatus } from '../../types/product';

const PROJECT_STATUS_LABELS: Record<string, ProjectStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

const PRODUCT_STATUS_LABELS: Record<string, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

interface ProjectDetailDialogProps {
  projectId: string | null;
  onClose: () => void;
}

export function ProjectDetailDialog({ projectId, onClose }: ProjectDetailDialogProps) {
  const [project, setProject] = useState<ApiProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setProject(null);
    setError(null);

    fetchProject(projectId)
      .then((data) => {
        if (!cancelled) setProject(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load project (HTTP ${err.status}).`
            : 'Failed to load project. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <Dialog open={Boolean(projectId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Project Details</DialogTitle>
      <DialogContent>
        {!project && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {project && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{project.name}</Typography>
              <StatusChip status={PROJECT_STATUS_LABELS[project.status]} />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Organization
              </Typography>
              <Typography variant="body2">{project.organization.name}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2">
                {project.description || 'No description provided.'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(project.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(project.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Products ({project._count.products})
              </Typography>
              {project.products.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No products belong to this project yet.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {project.products.map((product) => (
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
