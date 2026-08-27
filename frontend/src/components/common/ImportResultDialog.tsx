import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';

export interface ImportResultSummary {
  totalRows: number;
  successCount: number;
  errors: { row: number; message: string }[];
}

interface ImportResultDialogProps {
  result: ImportResultSummary | null;
  onClose: () => void;
}

// Shown after a CSV import completes -- imports are best-effort (valid rows
// are created even if others fail), so this always reports both counts
// rather than treating any row failure as a hard error.
export function ImportResultDialog({ result, onClose }: ImportResultDialogProps) {
  if (!result) return null;
  const failedCount = result.errors.length;

  return (
    <Dialog open={Boolean(result)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import Results</DialogTitle>
      <DialogContent dividers>
        <Alert severity={failedCount === 0 ? 'success' : result.successCount === 0 ? 'error' : 'warning'} sx={{ mb: 2 }}>
          {result.successCount} of {result.totalRows} row(s) imported successfully.
          {failedCount > 0 && ` ${failedCount} row(s) failed.`}
        </Alert>

        {failedCount > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Row errors
            </Typography>
            <List dense disablePadding>
              {result.errors.map((err) => (
                <ListItem key={err.row} divider disableGutters>
                  <ListItemText
                    primary={`Row ${err.row}`}
                    secondary={err.message}
                    slotProps={{ secondary: { color: 'error' } }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
