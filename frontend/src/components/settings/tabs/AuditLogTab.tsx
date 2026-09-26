import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { fetchAuditLog, fetchAuditLogFacets } from '../../../api/auditLog';
import type { AuditLogFilters } from '../../../api/auditLog';
import { exportToCsvWithAudit } from '../../../utils/csvExport';
import type { ApiAuditLogEntry } from '../../../types/settings';

// Audit-trail management: filter, search and export the trail. Entries are
// read-only -- there is no way to edit or delete audit history from here.
export function AuditLogTab() {
  const [filters, setFilters] = useState<AuditLogFilters>({ limit: 200 });
  const [facets, setFacets] = useState<{ entityTypes: string[]; actions: string[]; total: number } | null>(null);
  const [entries, setEntries] = useState<ApiAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAuditLogFacets()
      .then(setFacets)
      .catch(() => setFacets({ entityTypes: [], actions: [], total: 0 }));
  }, []);

  useEffect(() => {
    setError(null);
    setEntries(null);
    const toIso = (d?: string, endOfDay = false) =>
      d ? new Date(`${d}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`).toISOString() : undefined;
    fetchAuditLog({ ...filters, from: toIso(filters.from), to: toIso(filters.to, true) })
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit log.'));
  }, [filters]);

  // Debounce free-text search.
  useEffect(() => {
    const handle = setTimeout(() => setFilters((f) => ({ ...f, search: search.trim() || undefined })), 400);
    return () => clearTimeout(handle);
  }, [search]);

  const set = (key: keyof AuditLogFilters) => (value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  const handleExport = () => {
    if (!entries) return;
    exportToCsvWithAudit('AuditLog', 'audit-log.csv', entries, [
      { header: 'When', value: (e) => new Date(e.createdAt).toISOString() },
      { header: 'Actor', value: (e) => e.actor?.name ?? 'Unknown' },
      { header: 'Actor email', value: (e) => e.actor?.email ?? '' },
      { header: 'Action', value: (e) => e.action },
      { header: 'Entity type', value: (e) => e.entityType },
      { header: 'Entity id', value: (e) => e.entityId ?? '' },
      { header: 'Summary', value: (e) => e.summary },
    ]);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Who did what, and when. Audit entries are read-only and cannot be edited or deleted.
        {facets ? ` ${facets.total} entr${facets.total === 1 ? 'y' : 'ies'} recorded.` : ''}
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Entity type"
          value={filters.entityType ?? ''}
          onChange={(e) => set('entityType')(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All entities</MenuItem>
          {(facets?.entityTypes ?? []).map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Action"
          value={filters.action ?? ''}
          onChange={(e) => set('action')(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All actions</MenuItem>
          {(facets?.actions ?? []).map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="From"
          value={filters.from ?? ''}
          onChange={(e) => set('from')(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={filters.to ?? ''}
          onChange={(e) => set('to')(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="Search summary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={!entries || entries.length === 0}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </Stack>

      {entries === null && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {entries && entries.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No audit entries match these filters.</Typography>
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
                <TableCell>Entity</TableCell>
                <TableCell>Summary</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{entry.actor ? entry.actor.name : 'Unknown'}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.entityType}</TableCell>
                  <TableCell>{entry.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {entries && entries.length === (filters.limit ?? 200) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing the latest {entries.length} matching entries. Narrow the filters to see older ones.
        </Typography>
      )}
    </Box>
  );
}
