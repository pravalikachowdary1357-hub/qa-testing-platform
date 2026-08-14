import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import BugReportIcon from '@mui/icons-material/BugReport';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Api';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import TimelineIcon from '@mui/icons-material/Timeline';
import VerifiedIcon from '@mui/icons-material/Verified';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';

import { DashboardPage } from '../pages/DashboardPage';
import { OrganizationsPage } from '../pages/OrganizationsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { RequirementsPage } from '../pages/RequirementsPage';
import { TestPlansPage } from '../pages/TestPlansPage';
import { TestScenariosPage } from '../pages/TestScenariosPage';
import { TestCasesPage } from '../pages/TestCasesPage';
import { TestDataPage } from '../pages/TestDataPage';
import { EnvironmentsPage } from '../pages/EnvironmentsPage';
import { TestExecutionsPage } from '../pages/TestExecutionsPage';
import { PlaceholderPage } from '../components/common/PlaceholderPage';
import type { NavItemConfig } from '../types/navigation';

// Single source of truth for navigation: the Sidebar renders this list,
// and the router turns it into <Route> entries. Add a module here once
// and it appears in both places automatically.
export const navItems: NavItemConfig[] = [
  { path: '/', label: 'Dashboard', icon: DashboardIcon, element: <DashboardPage /> },
  {
    path: '/organization',
    label: 'Organization',
    icon: BusinessIcon,
    element: <OrganizationsPage />,
  },
  { path: '/products', label: 'Products', icon: Inventory2Icon, element: <ProductsPage /> },
  {
    path: '/requirements',
    label: 'Requirements',
    icon: AssignmentIcon,
    element: <RequirementsPage />,
  },
  {
    path: '/test-planning',
    label: 'Test Planning',
    icon: EventNoteIcon,
    element: <TestPlansPage />,
  },
  {
    path: '/test-scenarios',
    label: 'Test Scenarios',
    icon: AccountTreeIcon,
    element: <TestScenariosPage />,
  },
  {
    path: '/test-cases',
    label: 'Test Cases',
    icon: FactCheckIcon,
    element: <TestCasesPage />,
  },
  {
    path: '/test-data',
    label: 'Test Data',
    icon: StorageIcon,
    element: <TestDataPage />,
  },
  {
    path: '/environments',
    label: 'Environments',
    icon: DnsIcon,
    element: <EnvironmentsPage />,
  },
  {
    path: '/test-execution',
    label: 'Test Execution',
    icon: PlayCircleIcon,
    element: <TestExecutionsPage />,
  },
  {
    path: '/defects',
    label: 'Defects',
    icon: BugReportIcon,
    element: <PlaceholderPage title="Defects" />,
  },
  {
    path: '/automation',
    label: 'Automation',
    icon: SmartToyIcon,
    element: <PlaceholderPage title="Automation" />,
  },
  {
    path: '/api-testing',
    label: 'API Testing',
    icon: ApiIcon,
    element: <PlaceholderPage title="API Testing" />,
  },
  {
    path: '/performance-testing',
    label: 'Performance Testing',
    icon: SpeedIcon,
    element: <PlaceholderPage title="Performance Testing" />,
  },
  {
    path: '/security-testing',
    label: 'Security Testing',
    icon: SecurityIcon,
    element: <PlaceholderPage title="Security Testing" />,
  },
  { path: '/uat', label: 'UAT', icon: HowToRegIcon, element: <PlaceholderPage title="UAT" /> },
  {
    path: '/traceability',
    label: 'Traceability',
    icon: TimelineIcon,
    element: <PlaceholderPage title="Traceability" />,
  },
  {
    path: '/release-quality',
    label: 'Release Quality',
    icon: VerifiedIcon,
    element: <PlaceholderPage title="Release Quality" />,
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: AssessmentIcon,
    element: <PlaceholderPage title="Reports" />,
  },
  { path: '/ai', label: 'AI', icon: AutoAwesomeIcon, element: <PlaceholderPage title="AI" /> },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    element: <PlaceholderPage title="Settings" />,
  },
];
