import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { ApiError } from '../../api/client';
import { deleteOrganizationLogo, fetchOrganizationLogo, uploadOrganizationLogo } from '../../api/organizations';

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/svg+xml,image/webp';

interface OrganizationLogoProps {
  organizationId: string;
  hasLogo: boolean;
  onChanged: () => void;
}

// Logo bytes are served behind auth (GET /organizations/:id/logo), so a
// plain <img src="..."> can't carry the Authorization header -- fetch it as
// a blob and render via an object URL instead, same pattern used for
// viewing/downloading product documents elsewhere in this app.
export function OrganizationLogo({ organizationId, hasLogo, onChanged }: OrganizationLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (hasLogo) {
      fetchOrganizationLogo(organizationId)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setLogoUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setLogoUrl(null);
        });
    } else {
      setLogoUrl(null);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [organizationId, hasLogo]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;

    setBusy(true);
    try {
      await uploadOrganizationLogo(organizationId, file);
      onChanged();
      setSnackbar({ message: 'Logo updated.', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? err.message : 'Failed to upload logo.',
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await deleteOrganizationLogo(organizationId);
      onChanged();
      setSnackbar({ message: 'Logo removed.', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? err.message : 'Failed to remove logo.',
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar src={logoUrl ?? undefined} variant="rounded" sx={{ width: 64, height: 64, bgcolor: 'grey.200' }}>
        {!logoUrl && <BusinessIcon color="disabled" />}
      </Avatar>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Logo
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={handleUploadClick} disabled={busy}>
            {busy ? <CircularProgress size={16} /> : hasLogo ? 'Replace Logo' : 'Upload Logo'}
          </Button>
          {hasLogo && (
            <Button size="small" color="error" onClick={handleRemove} disabled={busy}>
              Remove
            </Button>
          )}
        </Stack>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={ACCEPTED_TYPES}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = '';
            void handleFileSelected(file);
          }}
        />
      </Stack>

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
