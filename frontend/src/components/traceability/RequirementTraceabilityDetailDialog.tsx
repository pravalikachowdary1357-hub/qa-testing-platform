import { Box, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { RequirementTraceabilityContent } from './RequirementTraceabilityContent';
import type { TraceabilityRequirementRow } from '../../types/traceability';

interface RequirementTraceabilityDetailDialogProps {
  requirement: TraceabilityRequirementRow | null;
  onClose: () => void;
}

export function RequirementTraceabilityDetailDialog({
  requirement,
  onClose,
}: RequirementTraceabilityDetailDialogProps) {
  return (
    <Dialog open={Boolean(requirement)} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Requirement Traceability</DialogTitle>
      <DialogContent>
        {requirement && (
          <Box sx={{ mt: 1 }}>
            <RequirementTraceabilityContent requirement={requirement} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
