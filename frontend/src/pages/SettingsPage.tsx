import { useState } from 'react';
import { Tab, Tabs } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import { PageHeader } from '../components/common/PageHeader';
import { PermissionGate } from '../components/settings/PermissionGate';
import { ProfileTab } from '../components/settings/tabs/ProfileTab';
import { OrganizationTab } from '../components/settings/tabs/OrganizationTab';
import { ProductConfigTab } from '../components/settings/tabs/ProductConfigTab';
import { UsersTab } from '../components/settings/tabs/UsersTab';
import { RolesTab } from '../components/settings/tabs/RolesTab';
import { AppSettingsTab } from '../components/settings/tabs/AppSettingsTab';
import { AuditLogTab } from '../components/settings/tabs/AuditLogTab';

const TABS = [
  { label: 'Profile', icon: PersonIcon },
  { label: 'Organization', icon: BusinessIcon },
  { label: 'Products', icon: Inventory2Icon },
  { label: 'Users', icon: GroupIcon },
  { label: 'Roles & Permissions', icon: AdminPanelSettingsIcon },
  { label: 'Application Settings', icon: TuneIcon },
  { label: 'Audit Log', icon: HistoryIcon },
] as const;

export function SettingsPage() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your profile, organization configuration, and administration -- visible sections depend on your role's permissions"
      />

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t) => (
          <Tab key={t.label} label={t.label} icon={<t.icon fontSize="small" />} iconPosition="start" />
        ))}
      </Tabs>

      {tab === 0 && <ProfileTab />}
      {tab === 1 && (
        <PermissionGate permission="organizations:read">
          <OrganizationTab />
        </PermissionGate>
      )}
      {tab === 2 && (
        <PermissionGate permission="organization:read">
          <ProductConfigTab />
        </PermissionGate>
      )}
      {tab === 3 && (
        <PermissionGate permission="users:read">
          <UsersTab />
        </PermissionGate>
      )}
      {tab === 4 && (
        <PermissionGate permission="roles:read">
          <RolesTab />
        </PermissionGate>
      )}
      {tab === 5 && (
        <PermissionGate permission="app_settings:read">
          <AppSettingsTab />
        </PermissionGate>
      )}
      {tab === 6 && (
        <PermissionGate permission="audit_log:read">
          <AuditLogTab />
        </PermissionGate>
      )}
    </>
  );
}
