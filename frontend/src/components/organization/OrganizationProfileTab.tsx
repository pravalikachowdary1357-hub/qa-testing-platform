import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Link,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import MailOutlineIcon from '@mui/icons-material/EmailOutlined';
import { ApiError } from '../../api/client';
import {
  deleteOrganizationLogo,
  fetchOrganizationLogo,
  updateOrganization,
  uploadOrganizationLogo,
} from '../../api/organizations';
import {
  deleteOrganizationDocument,
  downloadOrganizationDocument,
  fetchOrganizationDocuments,
  uploadOrganizationDocument,
} from '../../api/organizationDocuments';
import { useAuth } from '../../context/AuthContext';
import qmicsOrgLogo from '../../assets/qmics-org-logo.svg';
import type {
  ApiOrganizationDetail,
  ApiOrganizationDocument,
  UpdateOrganizationPayload,
} from '../../types/organization';

// TestSphere brand accents (logo gold + primary navy from theme.ts).
const GOLD = '#E0A800';
const GOLD_SOFT = '#FFF6D6';
const GOLD_BORDER = '#F5D77A';

const LOGO_TYPES = 'image/png,image/jpeg,image/svg+xml,image/webp';
const MAX_LOGO_MB = 2;
const MAX_DOCUMENT_MB = 4;

const cardSx = { p: 3, borderRadius: 3, border: 1, borderColor: 'divider' } as const;

const fileButtonSx = {
  bgcolor: GOLD_SOFT,
  color: GOLD,
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: 'none',
  px: 2,
  '&:hover': { bgcolor: '#FFEFB8', boxShadow: 'none' },
} as const;

interface FormState {
  orgReferenceId: string;
  orgKey: string;
  name: string;
  location: string;
  establishedYear: string;
  email: string;
}

function toForm(org: ApiOrganizationDetail): FormState {
  return {
    orgReferenceId: org.orgReferenceId ?? '',
    orgKey: org.orgKey ?? '',
    name: org.name,
    location: org.location ?? '',
    establishedYear: org.establishedYear != null ? String(org.establishedYear) : '',
    email: org.email ?? '',
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const year = new Date().getFullYear();
  if (!form.name.trim()) errors.name = 'Organization name is required.';
  if (form.orgKey && !/^[A-Z0-9]{2,10}$/.test(form.orgKey)) {
    errors.orgKey = '2-10 uppercase letters/digits (e.g. QMICS01).';
  }
  if (form.orgReferenceId && !/^[A-Za-z0-9-]{2,20}$/.test(form.orgReferenceId)) {
    errors.orgReferenceId = '2-20 letters/digits/hyphens (e.g. ORG-001).';
  }
  if (form.establishedYear) {
    const n = Number(form.establishedYear);
    if (!Number.isInteger(n) || n < 1800 || n > year + 1) {
      errors.establishedYear = `Enter a year between 1800 and ${year + 1}.`;
    }
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
}

// Only fields that changed are sent; cleared optional fields go as null so
// the backend actually clears them (IsOptional skips null validation).
function buildPayload(form: FormState, original: FormState): UpdateOrganizationPayload {
  const payload: Record<string, unknown> = {};
  (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
    const value = form[key].trim();
    if (value === original[key].trim()) return;
    if (key === 'establishedYear') {
      payload[key] = value ? Number(value) : null;
    } else if (key === 'name') {
      payload[key] = value;
    } else {
      payload[key] = value || null;
    }
  });
  return payload as UpdateOrganizationPayload;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="label"
      sx={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: 'text.secondary',
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}

function ProfileField({ label, value, onChange, error, readOnly, type, placeholder }: ProfileFieldProps) {
  return (
    <Box>
      <FieldLabel>{label}</FieldLabel>
      <TextField
        fullWidth
        size="small"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        error={Boolean(error)}
        helperText={error}
        slotProps={{ input: { readOnly } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: readOnly ? 'grey.50' : 'background.paper',
          },
        }}
      />
    </Box>
  );
}

interface OrganizationProfileTabProps {
  organization: ApiOrganizationDetail;
  onSaved: () => void;
}

export function OrganizationProfileTab({ organization, onSaved }: OrganizationProfileTabProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('organizations:write');
  const canManage = hasPermission('organizations:manage');

  const original = useMemo(() => toForm(organization), [organization]);
  const [form, setForm] = useState<FormState>(original);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);

  const [documents, setDocuments] = useState<ApiOrganizationDocument[] | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(original);
    setErrors({});
  }, [original]);

  const loadDocuments = () => {
    fetchOrganizationDocuments(organization.id)
      .then(setDocuments)
      .catch(() => setDocuments([]));
  };

  useEffect(() => {
    setDocuments(null);
    setPendingFiles([]);
    setPendingRemovals(new Set());
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  // Logo bytes sit behind auth, so fetch as a blob and show via object URL.
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (organization.hasLogo) {
      fetchOrganizationLogo(organization.id)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setLogoUrl(objectUrl);
        })
        .catch(() => !cancelled && setLogoUrl(null));
    } else {
      setLogoUrl(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [organization.id, organization.hasLogo]);

  const notifyError = (err: unknown, fallback: string) =>
    setSnackbar({ message: err instanceof ApiError ? err.message : fallback, severity: 'error' });

  const handleLogoSelected = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setSnackbar({ message: `Logo must be ${MAX_LOGO_MB} MB or smaller.`, severity: 'error' });
      return;
    }
    setLogoFileName(file.name);
    setLogoBusy(true);
    try {
      await uploadOrganizationLogo(organization.id, file);
      setSnackbar({ message: 'Logo updated.', severity: 'success' });
      onSaved();
    } catch (err) {
      notifyError(err, 'Failed to upload logo.');
    } finally {
      setLogoBusy(false);
      setLogoFileName(null);
    }
  };

  const handleLogoRemove = async () => {
    setLogoBusy(true);
    try {
      await deleteOrganizationLogo(organization.id);
      setSnackbar({ message: 'Logo removed.', severity: 'success' });
      onSaved();
    } catch (err) {
      notifyError(err, 'Failed to remove logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleDocsSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    const tooBig: string[] = [];
    Array.from(files).forEach((f) => (f.size > MAX_DOCUMENT_MB * 1024 * 1024 ? tooBig.push(f.name) : accepted.push(f)));
    if (tooBig.length) {
      setSnackbar({
        message: `Skipped (over ${MAX_DOCUMENT_MB} MB): ${tooBig.join(', ')}`,
        severity: 'error',
      });
    }
    setPendingFiles((prev) => [...prev, ...accepted]);
  };

  const handleOpenDocument = async (doc: ApiOrganizationDocument) => {
    try {
      const blob = await downloadOrganizationDocument(doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      notifyError(err, 'Failed to open file.');
    }
  };

  const payload = buildPayload(form, original);
  const isDirty = Object.keys(payload).length > 0 || pendingFiles.length > 0 || pendingRemovals.size > 0;

  const handleSave = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const failures: string[] = [];
    try {
      if (Object.keys(payload).length > 0) {
        await updateOrganization(organization.id, payload);
      }
      for (const id of pendingRemovals) {
        try {
          await deleteOrganizationDocument(id);
        } catch {
          failures.push(documents?.find((d) => d.id === id)?.fileName ?? 'a document');
        }
      }
      for (const file of pendingFiles) {
        try {
          await uploadOrganizationDocument(organization.id, file);
        } catch {
          failures.push(file.name);
        }
      }
      setPendingFiles([]);
      setPendingRemovals(new Set());
      loadDocuments();
      onSaved();
      setSnackbar(
        failures.length
          ? { message: `Saved, but these files failed: ${failures.join(', ')}`, severity: 'error' }
          : { message: 'Organization saved.', severity: 'success' },
      );
    } catch (err) {
      notifyError(err, 'Failed to save organization.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: key === 'orgKey' ? value.toUpperCase() : value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const subtitle = [
    organization.location,
    organization.establishedYear ? `Est. ${organization.establishedYear}` : null,
    organization.orgKey,
  ]
    .filter(Boolean)
    .join(' · ');

  // QMICS shows its official logo by default until a custom one is uploaded.
  const isQmics = /qmics/i.test(`${organization.name} ${organization.orgKey ?? ''}`);
  const displayLogo = logoUrl ?? (isQmics ? qmicsOrgLogo : null);

  const visibleDocs = (documents ?? []).filter((d) => !pendingRemovals.has(d.id));

  return (
    <Stack spacing={3}>
      {/* Header card: logo, identity, logo upload */}
      <Paper sx={cardSx}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Organization
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: 140,
                height: 140,
                flexShrink: 0,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: 'background.paper',
              }}
            >
              {logoBusy ? (
                <CircularProgress size={24} />
              ) : displayLogo ? (
                <Box
                  component="img"
                  src={displayLogo}
                  alt={`${organization.name} logo`}
                  sx={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                />
              ) : (
                <BusinessIcon sx={{ fontSize: 48, color: 'grey.400' }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
                {organization.name}
              </Typography>
              {subtitle && (
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
              {organization.email && (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 1 }}>
                  <MailOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {organization.email}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Stack>

          {canEdit && (
            <Box sx={{ minWidth: 240 }}>
              <FieldLabel>Logo</FieldLabel>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Button
                  variant="contained"
                  sx={fileButtonSx}
                  disabled={logoBusy}
                  onClick={() => logoInputRef.current?.click()}
                >
                  Choose File
                </Button>
                <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                  {logoFileName ?? 'No file chosen'}
                </Typography>
              </Stack>
              {organization.hasLogo && canManage && (
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  color="error"
                  variant="body2"
                  sx={{ mt: 1 }}
                  disabled={logoBusy}
                  onClick={() => void handleLogoRemove()}
                >
                  Remove logo
                </Link>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                PNG, JPG, SVG or WebP · max {MAX_LOGO_MB} MB
              </Typography>
              <input
                ref={logoInputRef}
                type="file"
                hidden
                accept={LOGO_TYPES}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = '';
                  void handleLogoSelected(file);
                }}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Details card: editable fields + documents + save */}
      <Paper sx={cardSx}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Organization Details
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ProfileField
              label="Org ID"
              value={form.orgReferenceId}
              onChange={set('orgReferenceId')}
              error={errors.orgReferenceId}
              readOnly={!canEdit || Boolean(organization.orgReferenceId)}
              placeholder="ORG-001"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ProfileField
              label="Org Code"
              value={form.orgKey}
              onChange={set('orgKey')}
              error={errors.orgKey}
              readOnly={!canEdit}
              placeholder="QMICS01"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ProfileField
              label="Organization Name"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              readOnly={!canEdit}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ProfileField
              label="Location"
              value={form.location}
              onChange={set('location')}
              readOnly={!canEdit}
              placeholder="Bangalore"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ProfileField
              label="Established Year"
              type="number"
              value={form.establishedYear}
              onChange={set('establishedYear')}
              error={errors.establishedYear}
              readOnly={!canEdit}
              placeholder="2015"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <ProfileField
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              readOnly={!canEdit}
              placeholder="info@company.com"
            />
          </Grid>

          <Grid size={12}>
            <FieldLabel>Documents (multiple files)</FieldLabel>
            {canEdit && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Button variant="contained" sx={fileButtonSx} onClick={() => docsInputRef.current?.click()}>
                  Choose Files
                </Button>
                <Typography variant="body2">
                  {pendingFiles.length === 0
                    ? 'No file chosen'
                    : `${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''} selected`}
                </Typography>
                <input
                  ref={docsInputRef}
                  type="file"
                  hidden
                  multiple
                  onChange={(e) => {
                    handleDocsSelected(e.target.files);
                    e.target.value = '';
                  }}
                />
              </Stack>
            )}

            {documents === null ? (
              <CircularProgress size={18} />
            ) : visibleDocs.length === 0 && pendingFiles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded yet.
              </Typography>
            ) : (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {visibleDocs.map((doc) => (
                  <Chip
                    key={doc.id}
                    size="small"
                    label={doc.fileName}
                    onClick={() => void handleOpenDocument(doc)}
                    onDelete={
                      canManage
                        ? () => setPendingRemovals((prev) => new Set(prev).add(doc.id))
                        : undefined
                    }
                    sx={{
                      bgcolor: GOLD_SOFT,
                      color: GOLD,
                      border: 1,
                      borderColor: GOLD_BORDER,
                      fontWeight: 500,
                      '& .MuiChip-deleteIcon': { color: GOLD, '&:hover': { color: '#B88A00' } },
                    }}
                  />
                ))}
                {pendingFiles.map((file, index) => (
                  <Chip
                    key={`pending-${file.name}-${index}`}
                    size="small"
                    label={`${file.name} (new)`}
                    variant="outlined"
                    onDelete={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                    sx={{ borderStyle: 'dashed', borderColor: GOLD_BORDER, color: GOLD }}
                  />
                ))}
              </Stack>
            )}
            {pendingRemovals.size > 0 && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {pendingRemovals.size} document{pendingRemovals.size > 1 ? 's' : ''} will be removed when you save.
              </Typography>
            )}
          </Grid>
        </Grid>

        {canEdit && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              disabled={saving || !isDirty}
              onClick={() => void handleSave()}
              sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Organization'}
            </Button>
            {isDirty && !saving && (
              <Button
                sx={{ textTransform: 'none' }}
                onClick={() => {
                  setForm(original);
                  setErrors({});
                  setPendingFiles([]);
                  setPendingRemovals(new Set());
                }}
              >
                Discard changes
              </Button>
            )}
          </Stack>
        )}
      </Paper>

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
    </Stack>
  );
}
