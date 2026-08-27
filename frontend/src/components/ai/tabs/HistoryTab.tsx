import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { StatusChip } from '../../common/StatusChip';
import { ImportExportToolbar } from '../../common/ImportExportToolbar';
import { deleteAiSuggestion, fetchAiSuggestions } from '../../../api/ai';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { exportToCsvWithAudit } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiAiSuggestion } from '../../../types/ai';
import type { ApiProduct } from '../../../types/product';

const CAPABILITY_LABELS: Record<string, string> = {
  GENERATE_TEST_SCENARIOS: 'Generate Scenarios',
  GENERATE_TEST_CASES: 'Generate Test Cases',
  SUGGEST_TEST_DATA: 'Suggest Test Data',
  ANALYZE_EXECUTION: 'Analyze Execution',
  SUMMARIZE_DEFECT: 'Summarize Defect',
  SUGGEST_DEFECT_SEVERITY: 'Suggest Severity',
  DUPLICATE_DEFECTS: 'Duplicate Defects',
  ANALYZE_COVERAGE: 'Coverage Insights',
  EXPLAIN_RELEASE_RISKS: 'Release Risk',
  CHAT: 'Chat',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EDITED_AND_ACCEPTED: 'Edited & Accepted',
};

export function HistoryTab({ products }: { products: ApiProduct[] }) {
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [capability, setCapability] = useState('');
  const [status, setStatus] = useState('');
  const [suggestions, setSuggestions] = useState<ApiAiSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ApiAiSuggestion | null>(null);

  const load = () => {
    setError(null);
    fetchAiSuggestions({ productId: productId || undefined, capability: capability || undefined, status: status || undefined })
      .then(setSuggestions)
      .catch((err) => setError(aiErrorMessage(err)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, capability, status]);

  const handleDelete = async (id: string) => {
    await deleteAiSuggestion(id).catch((err) => setError(aiErrorMessage(err)));
    load();
  };

  const handleExport = () => {
    if (!suggestions) return;
    exportToCsvWithAudit('AiSuggestion', 'ai-suggestion-history.csv', suggestions, [
      { header: 'Capability', value: (s) => CAPABILITY_LABELS[s.capability] ?? s.capability },
      { header: 'Prompt', value: (s) => s.prompt },
      { header: 'Response', value: (s) => s.response },
      { header: 'Status', value: (s) => STATUS_LABELS[s.status] ?? s.status },
      { header: 'Timestamp', value: (s) => new Date(s.createdAt).toLocaleString() },
    ]);
  };

  const isLoading = suggestions === null && !error;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          mb: 2,
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Every AI request and its response is recorded here -- the real audit trail behind "prompt/input
          history", independent of what's shown transiently in each tab.
        </Typography>
        <ImportExportToolbar
          onExport={handleExport}
          exportDisabled={!suggestions || suggestions.length === 0}
          exportLabel="Export History"
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField select size="small" label="Product" value={productId} onChange={(e) => setProductId(e.target.value)} sx={{ width: 200 }}>
          <MenuItem value="">All Products</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Capability" value={capability} onChange={(e) => setCapability(e.target.value)} sx={{ width: 220 }}>
          <MenuItem value="">All Capabilities</MenuItem>
          {Object.entries(CAPABILITY_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 180 }}>
          <MenuItem value="">All Statuses</MenuItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {suggestions && suggestions.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No AI activity recorded yet.</Typography>
        </Paper>
      )}

      {suggestions && suggestions.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Capability</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suggestions.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{CAPABILITY_LABELS[s.capability] ?? s.capability}</TableCell>
                  <TableCell>{s.sourceType ?? '—'}</TableCell>
                  <TableCell>{s.product?.name ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[s.status] ?? s.status} />
                  </TableCell>
                  <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewing(s)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(s.id)}>
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

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="md">
        <DialogTitle>AI Suggestion Detail</DialogTitle>
        <DialogContent>
          {viewing && (
            <Stack spacing={2}>
              <Typography variant="caption" color="text.secondary">Prompt sent</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
                {viewing.prompt}
              </Paper>
              <Typography variant="caption" color="text.secondary">Raw response</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
                {viewing.response}
              </Paper>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
