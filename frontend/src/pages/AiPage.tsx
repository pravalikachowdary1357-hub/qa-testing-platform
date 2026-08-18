import { useEffect, useState } from 'react';
import { Tab, Tabs } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import DataObjectIcon from '@mui/icons-material/DataObject';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import BugReportIcon from '@mui/icons-material/BugReport';
import ContentPasteSearchIcon from '@mui/icons-material/ContentPasteSearch';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import { PageHeader } from '../components/common/PageHeader';
import { AiStatusBanner } from '../components/ai/AiStatusBanner';
import { ChatTab } from '../components/ai/tabs/ChatTab';
import { GenerateScenariosTab } from '../components/ai/tabs/GenerateScenariosTab';
import { GenerateTestCasesTab } from '../components/ai/tabs/GenerateTestCasesTab';
import { SuggestTestDataTab } from '../components/ai/tabs/SuggestTestDataTab';
import { AnalyzeExecutionTab } from '../components/ai/tabs/AnalyzeExecutionTab';
import { DefectAssistantTab } from '../components/ai/tabs/DefectAssistantTab';
import { DuplicateDefectsTab } from '../components/ai/tabs/DuplicateDefectsTab';
import { CoverageInsightsTab } from '../components/ai/tabs/CoverageInsightsTab';
import { ReleaseRiskTab } from '../components/ai/tabs/ReleaseRiskTab';
import { HistoryTab } from '../components/ai/tabs/HistoryTab';
import { fetchAiStatus } from '../api/ai';
import { fetchProducts } from '../api/products';
import { aiErrorMessage } from '../utils/aiErrorMessage';
import type { AiStatus } from '../types/ai';
import type { ApiProduct } from '../types/product';

const TABS = [
  { label: 'Assistant', icon: ChatIcon },
  { label: 'Generate Scenarios', icon: AccountTreeIcon },
  { label: 'Generate Test Cases', icon: FactCheckIcon },
  { label: 'Test Data', icon: DataObjectIcon },
  { label: 'Failure Analysis', icon: PlayCircleIcon },
  { label: 'Defect Assistant', icon: BugReportIcon },
  { label: 'Duplicate Defects', icon: ContentPasteSearchIcon },
  { label: 'Coverage Insights', icon: AssignmentIcon },
  { label: 'Release Risk', icon: VerifiedIcon },
  { label: 'History', icon: HistoryIcon },
] as const;

export function AiPage() {
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    fetchAiStatus()
      .then(setStatus)
      .catch((err) => setStatusError(aiErrorMessage(err)));
    fetchProducts()
      .then(setProducts)
      .catch(() => {});
  }, []);

  const aiConfigured = Boolean(status?.configured && status?.featuresEnabled);

  return (
    <>
      <PageHeader
        title="AI Testing Assistant"
        subtitle="AI-assisted test design, defect triage, and quality insight -- every suggestion is reviewed before it touches real data"
      />

      <AiStatusBanner status={status} error={statusError} />

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

      {tab === 0 && <ChatTab aiConfigured={aiConfigured} />}
      {tab === 1 && <GenerateScenariosTab aiConfigured={aiConfigured} />}
      {tab === 2 && <GenerateTestCasesTab aiConfigured={aiConfigured} />}
      {tab === 3 && <SuggestTestDataTab aiConfigured={aiConfigured} />}
      {tab === 4 && <AnalyzeExecutionTab aiConfigured={aiConfigured} />}
      {tab === 5 && <DefectAssistantTab aiConfigured={aiConfigured} />}
      {tab === 6 && <DuplicateDefectsTab />}
      {tab === 7 && <CoverageInsightsTab aiConfigured={aiConfigured} />}
      {tab === 8 && <ReleaseRiskTab aiConfigured={aiConfigured} />}
      {tab === 9 && <HistoryTab products={products} />}
    </>
  );
}
