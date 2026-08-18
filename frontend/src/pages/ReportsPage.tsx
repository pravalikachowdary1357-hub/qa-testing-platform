import { useEffect, useState } from 'react';
import { Tab, Tabs } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimelineIcon from '@mui/icons-material/Timeline';
import BugReportIcon from '@mui/icons-material/BugReport';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Api';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import VerifiedIcon from '@mui/icons-material/Verified';
import { PageHeader } from '../components/common/PageHeader';
import { OverviewTab } from '../components/reports/tabs/OverviewTab';
import { TestExecutionTab } from '../components/reports/tabs/TestExecutionTab';
import { TestCaseStatusTab } from '../components/reports/tabs/TestCaseStatusTab';
import { RequirementCoverageTab } from '../components/reports/tabs/RequirementCoverageTab';
import { TraceabilityTab } from '../components/reports/tabs/TraceabilityTab';
import { DefectsTab } from '../components/reports/tabs/DefectsTab';
import { AutomationTab } from '../components/reports/tabs/AutomationTab';
import { ApiTestingTab } from '../components/reports/tabs/ApiTestingTab';
import { PerformanceTab } from '../components/reports/tabs/PerformanceTab';
import { SecurityTab } from '../components/reports/tabs/SecurityTab';
import { UatTab } from '../components/reports/tabs/UatTab';
import { ReleaseQualityTab } from '../components/reports/tabs/ReleaseQualityTab';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';

const TABS = [
  { label: 'Overview', icon: InsightsIcon },
  { label: 'Test Execution', icon: PlayCircleIcon },
  { label: 'Test Case Status', icon: FactCheckIcon },
  { label: 'Requirement Coverage', icon: AssignmentIcon },
  { label: 'Traceability', icon: TimelineIcon },
  { label: 'Defects', icon: BugReportIcon },
  { label: 'Automation', icon: SmartToyIcon },
  { label: 'API Testing', icon: ApiIcon },
  { label: 'Performance', icon: SpeedIcon },
  { label: 'Security', icon: SecurityIcon },
  { label: 'UAT', icon: HowToRegIcon },
  { label: 'Release Quality', icon: VerifiedIcon },
] as const;

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {});
    fetchEnvironments()
      .then((data) => {
        if (!cancelled) setEnvironments(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Real-time reporting generated from live test, defect, and quality data"
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

      {tab === 0 && <OverviewTab products={products} />}
      {tab === 1 && <TestExecutionTab products={products} environments={environments} />}
      {tab === 2 && <TestCaseStatusTab products={products} />}
      {tab === 3 && <RequirementCoverageTab products={products} />}
      {tab === 4 && <TraceabilityTab products={products} />}
      {tab === 5 && <DefectsTab products={products} environments={environments} />}
      {tab === 6 && <AutomationTab products={products} environments={environments} />}
      {tab === 7 && <ApiTestingTab products={products} environments={environments} />}
      {tab === 8 && <PerformanceTab products={products} environments={environments} />}
      {tab === 9 && <SecurityTab products={products} environments={environments} />}
      {tab === 10 && <UatTab products={products} />}
      {tab === 11 && <ReleaseQualityTab products={products} environments={environments} />}
    </>
  );
}
