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
import { fetchUsers } from '../../api/users';
import { ApiError } from '../../api/client';
import type { ApiUser } from '../../types/settings';

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive' };

interface OrganizationUsersTabProps {
  organizationId: string;
}

// Read-only: full user management (create/edit role/status/organization
// assignment) lives on Settings > Users. This just answers "who is in this
// organization" from within the Organization workspace.
export function OrganizationUsersTab({ organizationId }: OrganizationUsersTabProps) {
  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUsers(null);
    setError(null);
    fetchUsers({ organizationId })
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load users (HTTP ${err.status}).`
            : 'Failed to load users. Is the backend running?',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (!users && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  if (users && users.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No users assigned to this organization yet.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell>
              <TableCell sx={{ color: 'text.secondary' }}>{user.email}</TableCell>
              <TableCell>{user.role.name}</TableCell>
              <TableCell>
                <StatusChip status={STATUS_LABELS[user.status] ?? user.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
