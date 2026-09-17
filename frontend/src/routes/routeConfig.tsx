import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
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
import { ProjectsPage } from '../pages/ProjectsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { RequirementsPage } from '../pages/RequirementsPage';
import { TestPlansPage } from '../pages/TestPlansPage';
import { TestScenariosPage } from '../pages/TestScenariosPage';
import { TestCasesPage } from '../pages/TestCasesPage';
import { TestDataPage } from '../pages/TestDataPage';
import { EnvironmentsPage } from '../pages/EnvironmentsPage';
import { TestExecutionsPage } from '../pages/TestExecutionsPage';
import { DefectsPage } from '../pages/DefectsPage';
import { AutomationPage } from '../pages/AutomationPage';
import { ApiTestingPage } from '../pages/ApiTestingPage';
import { PerformanceTestingPage } from '../pages/PerformanceTestingPage';
import { SecurityTestingPage } from '../pages/SecurityTestingPage';
import { UatPage } from '../pages/UatPage';
import { TraceabilityPage } from '../pages/TraceabilityPage';
import { ReleaseQualityPage } from '../pages/ReleaseQualityPage';
import { ReportsPage } from '../pages/ReportsPage';
import { AiPage } from '../pages/AiPage';
import { SettingsPage } from '../pages/SettingsPage';
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
    permission: 'organizations:read',
  },
  {
    path: '/projects',
    label: 'Project',
    icon: FolderSpecialIcon,
    element: <ProjectsPage />,
    permission: 'projects:read',
  },
  {
    path: '/products',
    label: 'Products',
    icon: Inventory2Icon,
    element: <ProductsPage />,
    permission: 'products:read',
  },
  {
    path: '/requirements',
    label: 'Requirements',
    icon: AssignmentIcon,
    element: <RequirementsPage />,
    permission: 'requirements:read',
  },
  {
    path: '/test-planning',
    label: 'Test Planning',
    icon: EventNoteIcon,
    element: <TestPlansPage />,
    permission: 'test_plans:read',
  },
  {
    path: '/test-scenarios',
    label: 'Test Scenarios',
    icon: AccountTreeIcon,
    element: <TestScenariosPage />,
    permission: 'test_scenarios:read',
  },
  {
    path: '/test-cases',
    label: 'Test Cases',
    icon: FactCheckIcon,
    element: <TestCasesPage />,
    permission: 'test_cases:read',
  },
  {
    path: '/test-data',
    label: 'Test Data',
    icon: StorageIcon,
    element: <TestDataPage />,
    permission: 'test_data:read',
  },
  {
    path: '/environments',
    label: 'Environments',
    icon: DnsIcon,
    element: <EnvironmentsPage />,
    permission: 'environments:read',
  },
  {
    path: '/test-execution',
    label: 'Test Execution',
    icon: PlayCircleIcon,
    element: <TestExecutionsPage />,
    permission: 'test_executions:read',
  },
  {
    path: '/defects',
    label: 'Defects',
    icon: BugReportIcon,
    element: <DefectsPage />,
    permission: 'defects:read',
  },
  {
    path: '/automation',
    label: 'Automation',
    icon: SmartToyIcon,
    element: <AutomationPage />,
    permission: 'automation:read',
  },
  {
    path: '/api-testing',
    label: 'API Testing',
    icon: ApiIcon,
    element: <ApiTestingPage />,
    permission: 'api_testing:read',
  },
  {
    path: '/performance-testing',
    label: 'Performance Testing',
    icon: SpeedIcon,
    element: <PerformanceTestingPage />,
    permission: 'performance_testing:read',
  },
  {
    path: '/security-testing',
    label: 'Security Testing',
    icon: SecurityIcon,
    element: <SecurityTestingPage />,
    permission: 'security_testing:read',
  },
  {
    path: '/uat',
    label: 'UAT',
    icon: HowToRegIcon,
    element: <UatPage />,
    permission: 'uat:read',
  },
  {
    path: '/traceability',
    label: 'Traceability',
    icon: TimelineIcon,
    element: <TraceabilityPage />,
    permission: 'traceability:read',
  },
  {
    path: '/release-quality',
    label: 'Release Quality',
    icon: VerifiedIcon,
    element: <ReleaseQualityPage />,
    permission: 'release_quality:read',
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: AssessmentIcon,
    element: <ReportsPage />,
    permission: 'reports:read',
  },
  {
    path: '/ai',
    label: 'AI',
    icon: AutoAwesomeIcon,
    element: <AiPage />,
    permission: 'ai:read',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    element: <SettingsPage />,
  },
];
