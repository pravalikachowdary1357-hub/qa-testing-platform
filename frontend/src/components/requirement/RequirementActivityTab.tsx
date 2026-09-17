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
import { fetchRequirementActivity } from '../../api/requirements';
import { ApiError } from '../../api/client';
import type { ApiAuditLogEntry } from '../../types/settings';

interface RequirementActivityTabProps {
  requirementId: string;
}

export function RequirementActivityTab({ requirementId }: RequirementActivityTabProps) {
  const [entries, setEntries] = useState<ApiAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);

    fetchRequirementActivity(requirementId)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load activity (HTTP ${err.status}).`
            : 'Failed to load activity. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requirementId]);

  const isLoading = entries === null && !error;

  return (
    <Box>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {entries && entries.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No activity recorded yet.</Typography>
        </Paper>
      )}

      {entries && entries.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{entry.actor ? entry.actor.name : 'System'}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{entry.action}</TableCell>
                  <TableCell>{entry.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
