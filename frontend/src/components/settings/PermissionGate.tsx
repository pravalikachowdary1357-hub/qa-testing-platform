import { Alert } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
}

// Backend is the authority on every mutation regardless of what this
// renders -- this only controls whether the section's content or a clear
// "permission denied" state is shown.
export function PermissionGate({ permission, children }: PermissionGateProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <Alert severity="warning">
        You do not have permission to view this section. Contact an administrator if you believe
        this is incorrect.
      </Alert>
    );
  }
  return <>{children}</>;
}
