import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  createTestTemplate,
  deleteTestTemplate,
  fetchTestTemplates,
  updateTestTemplate,
} from '../../../api/adminConfig';
import { useAuth } from '../../../context/AuthContext';
import type { ApiTestTemplate, TemplateStep, TestTemplatePayload } from '../../../types/adminConfig';

const PRIORITIES: ApiTestTemplate['priority'][] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const emptyForm = (): TestTemplatePayload => ({
  name: '',
  description: '',
  preconditions: '',
  expectedResult: '',
  priority: 'MEDIUM',
  steps: [{ action: '', expectedResult: '' }],
  isActive: true,
});

function TemplateDialog({
  template,
  open,
  onClose,
  onSaved,
}: {
  template: ApiTestTemplate | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TestTemplatePayload>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      template
        ? {
            name: template.name,
            description: template.description ?? '',
            preconditions: template.preconditions ?? '',
            expectedResult: template.expectedResult ?? '',
            priority: template.priority,
            steps: template.steps.length ? template.steps : [{ action: '', expectedResult: '' }],
            isActive: template.isActive,
          }
        : emptyForm(),
    );
  }, [open, template]);

  const setStep = (index: number, field: keyof TemplateStep, value: string) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }));

  const save = async () => {
    const steps = form.steps.filter((s) => s.action.trim() || s.expectedResult.trim());
    if (!form.name.trim()) return setError('Template name is required.');
    if (steps.some((s) => !s.action.trim())) return setError('Every step needs an action.');
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, name: form.name.trim(), steps };
      if (template) await updateTestTemplate(template.id, payload);
      else await createTestTemplate(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{template ? 'Edit Test Case Template' : 'Create Test Case Template'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Template name"
              required
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              select
              label="Default priority"
              sx={{ minWidth: 180 }}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as ApiTestTemplate['priority'] })}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Description"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Preconditions"
            multiline
            minRows={2}
            value={form.preconditions}
            onChange={(e) => setForm({ ...form, preconditions: e.target.value })}
          />
          <TextField
            label="Overall expected result"
            multiline
            minRows={2}
            value={form.expectedResult}
            onChange={(e) => setForm({ ...form, expectedResult: e.target.value })}
          />
          <Typography variant="subtitle2">Steps</Typography>
          {form.steps.map((step, index) => (
            <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
              <Typography sx={{ pt: 1, minWidth: 24 }}>{index + 1}.</Typography>
              <TextField
                size="small"
                label="Action"
                fullWidth
                value={step.action}
                onChange={(e) => setStep(index, 'action', e.target.value)}
              />
              <TextField
                size="small"
                label="Expected result"
                fullWidth
                value={step.expectedResult}
                onChange={(e) => setStep(index, 'expectedResult', e.target.value)}
              />
              <IconButton
                aria-label="Remove step"
                disabled={form.steps.length === 1}
                onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }))}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { action: '', expectedResult: '' }] }))}
            >
              Add step
            </Button>
          </Box>
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
            label="Active"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TestTemplatesTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('test_templates:manage');
  const [templates, setTemplates] = useState<ApiTestTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiTestTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<ApiTestTemplate | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () =>
    fetchTestTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load templates.'));

  useEffect(() => {
    void load();
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTestTemplate(deleting.id);
      setMessage(`Deleted "${deleting.name}".`);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template.');
    } finally {
      setDeleting(null);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!templates) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Reusable test case structures (priority, preconditions and steps) for test authors.
        </Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Create Template
          </Button>
        )}
      </Stack>

      {templates.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No test case templates yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell align="right">Steps</TableCell>
                <TableCell>Status</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.name}</TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {t.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}</TableCell>
                  <TableCell align="right">{t.steps.length}</TableCell>
                  <TableCell>
                    <Chip size="small" label={t.isActive ? 'Active' : 'Inactive'} color={t.isActive ? 'success' : 'default'} />
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditing(t);
                            setDialogOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleting(t)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TemplateDialog
        open={dialogOpen}
        template={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setMessage('Template saved.');
          void load();
        }}
      />

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete template?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete &ldquo;{deleting?.name}&rdquo;? Existing test cases are not affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message ? (
          <Alert severity="success" onClose={() => setMessage(null)}>
            {message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
