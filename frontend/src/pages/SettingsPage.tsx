import { useState } from 'react';
import type { ReactNode } from 'react';
import { Tab, Tabs } from '@mui/material';
import type SvgIcon from '@mui/material/SvgIcon';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import HubIcon from '@mui/icons-material/Hub';
import ArchiveIcon from '@mui/icons-material/Archive';
import { PageHeader } from '../components/common/PageHeader';
import { PermissionGate } from '../components/settings/PermissionGate';
import { ProfileTab } from '../components/settings/tabs/ProfileTab';
import { OrganizationTab } from '../components/settings/tabs/OrganizationTab';
import { ProductConfigTab } from '../components/settings/tabs/ProductConfigTab';
import { UsersTab } from '../components/settings/tabs/UsersTab';
import { RolesTab } from '../components/settings/tabs/RolesTab';
import { AppSettingsTab } from '../components/settings/tabs/AppSettingsTab';
import { AuditLogTab } from '../components/settings/tabs/AuditLogTab';
import { WorkflowsTab } from '../components/settings/tabs/WorkflowsTab';
import { TestTemplatesTab } from '../components/settings/tabs/TestTemplatesTab';
import { DashboardConfigTab } from '../components/settings/tabs/DashboardConfigTab';
import { IntegrationsTab } from '../components/settings/tabs/IntegrationsTab';
import { DataRetentionTab } from '../components/settings/tabs/DataRetentionTab';
import { OrganizationsAdminTab } from '../components/settings/tabs/OrganizationsAdminTab';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import { useAuth } from '../context/AuthContext';

interface SettingsTab {
  label: string;
  icon: typeof SvgIcon;
  // Existing tabs are always listed and show a permission notice when the
  // user lacks access. The administration-configuration tabs added later
  // are only listed for users who hold their permission.
  permission?: string;
  hideWithoutPermission?: boolean;
  content: ReactNode;
}

const TABS: SettingsTab[] = [
  { label: 'Profile', icon: PersonIcon, content: <ProfileTab /> },
  { label: 'Organization', icon: BusinessIcon, permission: 'organizations:read', content: <OrganizationTab /> },
  { label: 'All Organizations', icon: CorporateFareIcon, permission: 'organizations:write', hideWithoutPermission: true, content: <OrganizationsAdminTab /> },
  { label: 'Products', icon: Inventory2Icon, permission: 'organization:read', content: <ProductConfigTab /> },
  { label: 'Users', icon: GroupIcon, permission: 'users:read', content: <UsersTab /> },
  { label: 'Roles & Permissions', icon: AdminPanelSettingsIcon, permission: 'roles:read', content: <RolesTab /> },
  { label: 'Application Settings', icon: TuneIcon, permission: 'app_settings:read', content: <AppSettingsTab /> },
  { label: 'Audit Log', icon: HistoryIcon, permission: 'audit_log:read', content: <AuditLogTab /> },
  { label: 'Workflows', icon: AccountTreeIcon, permission: 'workflows:read', hideWithoutPermission: true, content: <WorkflowsTab /> },
  { label: 'Test Templates', icon: ListAltIcon, permission: 'test_templates:manage', hideWithoutPermission: true, content: <TestTemplatesTab /> },
  { label: 'Dashboard', icon: DashboardCustomizeIcon, permission: 'dashboards:manage', hideWithoutPermission: true, content: <DashboardConfigTab /> },
  { label: 'Integrations', icon: HubIcon, permission: 'integrations:read', hideWithoutPermission: true, content: <IntegrationsTab /> },
  { label: 'Data Retention', icon: ArchiveIcon, permission: 'app_settings:read', hideWithoutPermission: true, content: <DataRetentionTab /> },
];

export function SettingsPage() {
  const [tab, setTab] = useState(0);
  const { hasPermission } = useAuth();

  const visibleTabs = TABS.filter(
    (t) => !t.hideWithoutPermission || (t.permission && hasPermission(t.permission)),
  );
  const current = visibleTabs[tab] ?? visibleTabs[0];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your profile, organization configuration, and administration -- visible sections depend on your role's permissions"
      />

      <Tabs
        value={visibleTabs.indexOf(current)}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {visibleTabs.map((t) => (
          <Tab key={t.label} label={t.label} icon={<t.icon fontSize="small" />} iconPosition="start" />
        ))}
      </Tabs>

      {current.permission ? (
        <PermissionGate key={current.label} permission={current.permission}>
          {current.content}
        </PermissionGate>
      ) : (
        current.content
      )}
    </>
  );
}
