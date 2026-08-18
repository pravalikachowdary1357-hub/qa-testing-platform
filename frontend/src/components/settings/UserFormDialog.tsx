import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type { ApiRole } from '../../types/settings';
import type { ApiUser } from '../../types/settings';

interface FormValues {
  email: string;
  name: string;
  password: string;
  roleId: string;
}

interface FieldErrors {
  email?: string;
  name?: string;
  password?: string;
  roleId?: string;
}

interface UserFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  user: ApiUser | null;
  roles: ApiRole[];
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}

function emptyValues(defaultRoleId: string): FormValues {
  return { email: '', name: '', password: '', roleId: defaultRoleId };
}

export function UserFormDialog({
  open,
  mode,
  user,
  roles,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const [values, setValues] = useState<FormValues>(emptyValues(roles[0]?.id ?? ''));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setFieldErrors({});
    if (mode === 'edit' && user) {
      setValues({ email: user.email, name: user.name, password: '', roleId: user.role.id });
    } else {
      setValues(emptyValues(roles[0]?.id ?? ''));
    }
  }, [open, mode, user, roles]);

  const handleSubmit = async () => {
    const errors: FieldErrors = {};
    if (mode === 'create' && !values.email.trim()) errors.email = 'Email is required.';
    if (!values.name.trim()) errors.name = 'Name is required.';
    if (mode === 'create' && values.password.trim().length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    if (!values.roleId) errors.roleId = 'Role is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create User' : 'Edit User'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => {
              setValues((v) => ({ ...v, email: e.target.value }));
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            disabled={mode === 'edit'}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email ?? ' '}
            fullWidth
            required={mode === 'create'}
          />
          <TextField
            label="Name"
            value={values.name}
            onChange={(e) => {
              setValues((v) => ({ ...v, name: e.target.value }));
              if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
            }}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name ?? ' '}
            fullWidth
            required
          />
          {mode === 'create' && (
            <TextField
              label="Initial Password"
              type="password"
              value={values.password}
              onChange={(e) => {
                setValues((v) => ({ ...v, password: e.target.value }));
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              error={Boolean(fieldErrors.password)}
              helperText={
                fieldErrors.password ??
                'There is no email/invite system yet -- share this password with the user directly.'
              }
              fullWidth
              required
            />
          )}
          <TextField
            select
            label="Role"
            value={values.roleId}
            onChange={(e) => {
              setValues((v) => ({ ...v, roleId: e.target.value }));
              if (fieldErrors.roleId) setFieldErrors((f) => ({ ...f, roleId: undefined }));
            }}
            error={Boolean(fieldErrors.roleId)}
            helperText={fieldErrors.roleId ?? ' '}
            fullWidth
            required
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
