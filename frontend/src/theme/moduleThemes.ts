import type SvgIcon from '@mui/material/SvgIcon';
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

// Visual identity per module page: the hero banner colour, its icon and the
// sidebar group it belongs to (QMICS product style). Content is untouched;
// this only decides how each page's header looks.

// TestSphere brand (from the TestSphere logo): deep royal blue with gold.
export const BRAND = {
  navy: '#0A2A57',
  blue: '#1454A6',
  gold: '#F5B800',
  goldDark: '#C99400',
};

// Sidebar (all roles): TestSphere navy with a gold active item.
export const SIDEBAR = {
  background: 'linear-gradient(180deg, #0B2F63 0%, #0A2A57 55%, #081F42 100%)',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(245,184,0,0.85)',
  hover: 'rgba(255,255,255,0.10)',
  selectedBg: '#F5B800',
  selectedText: '#0A2A57',
};

export interface ModuleTheme {
  gradient: string;
  accent: string;
  icon: typeof SvgIcon;
  group: string;
}

const DASHBOARD = 'linear-gradient(120deg, #081F42 0%, #0B2F63 50%, #1454A6 100%)';
const ADMIN = 'linear-gradient(120deg, #0B2F63 0%, #1A4F9C 55%, #2C6FD1 100%)';
const PLANNING = 'linear-gradient(120deg, #0A3A78 0%, #1462B8 55%, #2A86DB 100%)';
const EXECUTION = 'linear-gradient(120deg, #0B2F63 0%, #16509E 55%, #3470C9 100%)';
const DEFECTS = 'linear-gradient(120deg, #0B2F63 0%, #3B3F8F 55%, #B03A5B 100%)';
const INSIGHTS = 'linear-gradient(120deg, #0B2F63 0%, #1454A6 50%, #D99A00 100%)';
const UAT = 'linear-gradient(120deg, #0A3A78 0%, #136C9E 55%, #1E9E8E 100%)';
const AI = 'linear-gradient(120deg, #1B2A6B 0%, #3A3FA8 55%, #6B5BD6 100%)';
const SPECIALIZED = 'linear-gradient(120deg, #0A2A57 0%, #214A8C 55%, #3A6BB8 100%)';

export const MODULE_THEMES: Record<string, ModuleTheme> = {
  '': { gradient: DASHBOARD, accent: '#0B2F63', icon: DashboardIcon, group: 'main' },
  organization: { gradient: ADMIN, accent: '#0B2F63', icon: BusinessIcon, group: 'administration' },
  projects: { gradient: ADMIN, accent: '#0B2F63', icon: FolderSpecialIcon, group: 'administration' },
  products: { gradient: ADMIN, accent: '#0B2F63', icon: Inventory2Icon, group: 'administration' },
  requirements: { gradient: PLANNING, accent: '#0B2F63', icon: AssignmentIcon, group: 'planning' },
  'test-planning': { gradient: PLANNING, accent: '#0B2F63', icon: EventNoteIcon, group: 'planning' },
  'test-scenarios': { gradient: PLANNING, accent: '#0B2F63', icon: AccountTreeIcon, group: 'planning' },
  'test-cases': { gradient: PLANNING, accent: '#0B2F63', icon: FactCheckIcon, group: 'planning' },
  'test-data': { gradient: PLANNING, accent: '#0B2F63', icon: StorageIcon, group: 'planning' },
  environments: { gradient: PLANNING, accent: '#0B2F63', icon: DnsIcon, group: 'planning' },
  'test-execution': { gradient: EXECUTION, accent: '#0B2F63', icon: PlayCircleIcon, group: 'execution' },
  defects: { gradient: DEFECTS, accent: '#0B2F63', icon: BugReportIcon, group: 'execution' },
  automation: { gradient: SPECIALIZED, accent: '#0B2F63', icon: SmartToyIcon, group: 'execution' },
  'api-testing': { gradient: SPECIALIZED, accent: '#0B2F63', icon: ApiIcon, group: 'execution' },
  'performance-testing': { gradient: SPECIALIZED, accent: '#0B2F63', icon: SpeedIcon, group: 'execution' },
  'security-testing': { gradient: SPECIALIZED, accent: '#0B2F63', icon: SecurityIcon, group: 'execution' },
  uat: { gradient: UAT, accent: '#0B2F63', icon: HowToRegIcon, group: 'execution' },
  traceability: { gradient: INSIGHTS, accent: '#0B2F63', icon: TimelineIcon, group: 'insights' },
  'release-quality': { gradient: INSIGHTS, accent: '#0B2F63', icon: VerifiedIcon, group: 'insights' },
  reports: { gradient: INSIGHTS, accent: '#0B2F63', icon: AssessmentIcon, group: 'insights' },
  ai: { gradient: AI, accent: '#0B2F63', icon: AutoAwesomeIcon, group: 'insights' },
  settings: { gradient: ADMIN, accent: '#0B2F63', icon: SettingsIcon, group: 'system' },
};

export const SIDEBAR_GROUPS: { key: string; label: string }[] = [
  { key: 'main', label: '' },
  { key: 'administration', label: 'Administration' },
  { key: 'planning', label: 'Planning & Design' },
  { key: 'execution', label: 'Execution' },
  { key: 'insights', label: 'Quality & Insights' },
  { key: 'system', label: 'System' },
];

export function moduleKeyFromPath(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}

export function moduleTheme(pathname: string): ModuleTheme {
  return MODULE_THEMES[moduleKeyFromPath(pathname)] ?? MODULE_THEMES[''];
}
