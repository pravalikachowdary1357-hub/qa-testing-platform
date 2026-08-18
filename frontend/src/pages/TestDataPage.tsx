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
import { TestDataFormDialog } from '../components/testdata/TestDataFormDialog';
import { TestDataDetailDialog } from '../components/testdata/TestDataDetailDialog';
import { DeleteTestDataDialog } from '../components/testdata/DeleteTestDataDialog';
import {
  createTestData,
  deleteTestData,
  fetchTestDataById,
  fetchTestDataList,
  updateTestData,
} from '../api/testData';
import { fetchTestCases } from '../api/testCases';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiTestDataListItem,
  ApiTestDataType,
  CreateTestDataPayload,
  TestDataType,
} from '../types/testData';
import type { ApiTestCase } from '../types/testCase';

const TYPE_LABELS: Record<ApiTestDataType, TestDataType> = {
  INPUT: 'Input',
  EXPECTED_OUTPUT: 'Expected Output',
  CREDENTIALS: 'Credentials',
  CONFIGURATION: 'Configuration',
  REFERENCE: 'Reference',
};

type SortOption = 'newest' | 'oldest' | 'name';

const ALL = 'ALL' as const;

interface EditingTestData {
  id: string;
  testCaseId: string;
  name: string;
  description: string;
  type: ApiTestDataType;
  value: string;
}

export function TestDataPage() {
  const { currentProduct } = useProductContext();
  const [testDataList, setTestDataList] = useState<ApiTestDataListItem[] | null>(null);
  const [testCases, setTestCases] = useState<ApiTestCase[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ApiTestDataType | typeof ALL>(ALL);
  const [testCaseFilter, setTestCaseFilter] = useState<string | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingTestData, setEditingTestData] = useState<EditingTestData | null>(null);
  const [viewingTestDataId, setViewingTestDataId] = useState<string | null>(null);
  const [deletingTestData, setDeletingTestData] = useState<ApiTestDataListItem | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadTestDataList = () => {
    setError(null);
    return fetchTestDataList(currentProduct?.id)
      .then((data) => setTestDataList(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load test data (HTTP ${err.status}).`
            : 'Failed to load test data. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setTestDataList(null);

    fetchTestDataList(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestDataList(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test data (HTTP ${err.status}).`
            : 'Failed to load test data. Is the backend running?',
        );
      });

    fetchTestCases(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestCases(data);
      })
      .catch(() => {
        // Only feeds the create/edit dropdown and the filter bar.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleTestDataList = useMemo(() => {
    if (!testDataList) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = testDataList.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (typeFilter !== ALL && item.type !== typeFilter) return false;
      if (testCaseFilter !== ALL && item.testCaseId !== testCaseFilter) return false;
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
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [testDataList, searchQuery, typeFilter, testCaseFilter, sortBy]);

  const isLoading = testDataList === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || typeFilter !== ALL || testCaseFilter !== ALL;

  const handleCreateSubmit = async (data: CreateTestDataPayload) => {
    await createTestData(data);
    await loadTestDataList();
    setSnackbar({ message: 'Test data created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateTestDataPayload) => {
    if (!editingTestData) return;
    await updateTestData(editingTestData.id, data);
    await loadTestDataList();
    setSnackbar({ message: 'Test data updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTestData) return;
    await deleteTestData(deletingTestData.id);
    await loadTestDataList();
    setSnackbar({ message: 'Test data deleted.', severity: 'success' });
  };

  const handleEditClick = async (item: ApiTestDataListItem) => {
    try {
      const full = await fetchTestDataById(item.id);
      setEditingTestData({
        id: full.id,
        testCaseId: full.testCaseId ?? '',
        name: full.name,
        description: full.description ?? '',
        type: full.type,
        value: full.value,
      });
      setFormMode('edit');
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError
            ? `Failed to load test data (HTTP ${err.status}).`
            : 'Failed to load test data for editing.',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Test Data"
        subtitle="Reusable data records for driving and verifying test execution"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Data
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
            placeholder="Search test data by name…"
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
            label="Test Case"
            value={testCaseFilter}
            onChange={(e) => setTestCaseFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 180 } }}
          >
            <MenuItem value={ALL}>All Test Cases</MenuItem>
            {testCases.map((testCase) => (
              <MenuItem key={testCase.id} value={testCase.id}>
                {testCase.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ApiTestDataType | typeof ALL)}
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
            <MenuItem value="name">Name (A-Z)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {testDataList && testDataList.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No test data found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Data
          </Button>
        </Paper>
      )}

      {testDataList && testDataList.length > 0 && visibleTestDataList.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No test data matches the current search/filters.'
              : 'No test data found.'}
          </Typography>
        </Paper>
      )}

      {visibleTestDataList.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Test Case</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTestDataList.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {item.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.description ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.testCase?.title ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={TYPE_LABELS[item.type]} />
                  </TableCell>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingTestDataId(item.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditClick(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingTestData(item)}>
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

      <TestDataFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        testCases={testCases}
        initialValues={
          formMode === 'edit' && editingTestData
            ? {
                testCaseId: editingTestData.testCaseId,
                name: editingTestData.name,
                description: editingTestData.description,
                type: editingTestData.type,
                value: editingTestData.value,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingTestData(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <TestDataDetailDialog
        testDataId={viewingTestDataId}
        onClose={() => setViewingTestDataId(null)}
      />

      <DeleteTestDataDialog
        testData={deletingTestData}
        onClose={() => setDeletingTestData(null)}
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
