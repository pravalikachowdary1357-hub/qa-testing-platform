import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { RequirementTraceabilityContent } from '../traceability/RequirementTraceabilityContent';
import { fetchTraceabilityMatrix } from '../../api/traceability';
import { ApiError } from '../../api/client';
import type { TraceabilityRequirementRow } from '../../types/traceability';

interface RequirementTraceabilityTabProps {
  requirementId: string;
  productId: string;
}

// Reuses the existing /traceability matrix (already computes the full
// Requirement -> TestScenario -> TestCase -> TestExecution/Defect chain for
// the whole product) rather than adding a new per-requirement endpoint --
// picks out the one row that matches this requirement.
export function RequirementTraceabilityTab({
  requirementId,
  productId,
}: RequirementTraceabilityTabProps) {
  const [row, setRow] = useState<TraceabilityRequirementRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRow(undefined);
    setError(null);

    fetchTraceabilityMatrix(productId)
      .then((matrix) => {
        if (cancelled) return;
        setRow(matrix.requirements.find((r) => r.id === requirementId) ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load traceability (HTTP ${err.status}).`
            : 'Failed to load traceability. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [requirementId, productId]);

  if (error) return <Alert severity="error">{error}</Alert>;

  if (row === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (row === null) {
    return (
      <Alert severity="info">
        No traceability data available for this requirement yet — it has no linked test scenarios.
      </Alert>
    );
  }

  return <RequirementTraceabilityContent requirement={row} showHeader={false} />;
}
