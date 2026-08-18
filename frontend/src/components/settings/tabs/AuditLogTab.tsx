import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { fetchAuditLog } from '../../../api/auditLog';
import type { ApiAuditLogEntry } from '../../../types/settings';

const ENTITY_TYPES = ['User', 'Role', 'AppSetting'];

export function AuditLogTab() {
  const [entityType, setEntityType] = useState('');
  const [entries, setEntries] = useState<ApiAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetchAuditLog(entityType || undefined)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit log.'));
  }, [entityType]);

  const isLoading = entries === null && !error;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Administrative changes to users, roles, and application settings are recorded here. Changes
        made through the pre-existing Organization/Product endpoints are not included.
      </Typography>
      <TextField
        select
        size="small"
        label="Entity Type"
        value={entityType}
        onChange={(e) => setEntityType(e.target.value)}
        sx={{ width: 200, mb: 2 }}
      >
        <MenuItem value="">All Entities</MenuItem>
        {ENTITY_TYPES.map((t) => (
          <MenuItem key={t} value={t}>
            {t}
          </MenuItem>
        ))}
      </TextField>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {entries && entries.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No administrative changes recorded yet.</Typography>
        </Paper>
      )}
      {entries && entries.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Summary</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{entry.actor ? entry.actor.name : 'Unknown'}</TableCell>
                  <TableCell>{entry.action}</TableCell>
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
