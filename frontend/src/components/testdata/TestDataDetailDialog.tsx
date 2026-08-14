import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { StatusChip } from '../common/StatusChip';
import { fetchTestDataById } from '../../api/testData';
import { ApiError } from '../../api/client';
import type { ApiTestData, TestDataType } from '../../types/testData';

const TYPE_LABELS: Record<string, TestDataType> = {
  INPUT: 'Input',
  EXPECTED_OUTPUT: 'Expected Output',
  CREDENTIALS: 'Credentials',
  CONFIGURATION: 'Configuration',
  REFERENCE: 'Reference',
};

const MASK = '••••••••••••';

interface TestDataDetailDialogProps {
  testDataId: string | null;
  onClose: () => void;
}

export function TestDataDetailDialog({ testDataId, onClose }: TestDataDetailDialogProps) {
  const [testData, setTestData] = useState<ApiTestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!testDataId) {
      setTestData(null);
      setError(null);
      setRevealed(false);
      return;
    }

    let cancelled = false;
    setTestData(null);
    setError(null);
    setRevealed(false);

    fetchTestDataById(testDataId)
      .then((data) => {
        if (!cancelled) setTestData(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test data (HTTP ${err.status}).`
            : 'Failed to load test data. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [testDataId]);

  return (
    <Dialog open={Boolean(testDataId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Test Data Details</DialogTitle>
      <DialogContent>
        {!testData && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {testData && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{testData.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {testData.testCase ? `Used by: ${testData.testCase.title}` : 'Not linked to a test case'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={TYPE_LABELS[testData.type]} />
            </Stack>

            {testData.description && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {testData.description}
                </Typography>
              </Box>
            )}

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Value
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setRevealed((prev) => !prev)}
                  aria-label={revealed ? 'Hide value' : 'Show value'}
                >
                  {revealed ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              </Stack>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: revealed ? 'monospace' : undefined }}
              >
                {revealed ? testData.value : MASK}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(testData.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(testData.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
