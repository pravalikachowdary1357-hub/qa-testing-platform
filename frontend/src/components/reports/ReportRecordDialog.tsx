import { Box, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface ReportRecordField {
  label: string;
  value: ReactNode;
}

interface ReportRecordDialogProps {
  title: string | null;
  subtitle?: string;
  fields: ReportRecordField[];
  onClose: () => void;
}

// Generic read-only drill-down viewer shared by every report tab -- each
// tab builds its own `fields` list from the row that was clicked, rather
// than each report maintaining its own bespoke detail dialog.
export function ReportRecordDialog({ title, subtitle, fields, onClose }: ReportRecordDialogProps) {
  return (
    <Dialog open={Boolean(title)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        )}
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {fields.map((field) => (
            <Box key={field.label}>
              <Typography variant="caption" color="text.secondary">
                {field.label}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {field.value ?? '—'}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
