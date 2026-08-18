import { Box } from '@mui/material';
import { HomeAmbientBackground } from '../components/home/HomeAmbientBackground';
import { HomeHeader } from '../components/home/HomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { DashboardPreviewSection } from '../components/home/DashboardPreviewSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { FeatureSection } from '../components/home/FeatureSection';
import {
  TestPlanningVisual,
  TestCaseVisual,
  TestExecutionVisual,
  DefectVisual,
  ReportsVisual,
  WorkflowVisual,
} from '../components/home/FeatureVisuals';
import { StatsStrip } from '../components/home/StatsStrip';
import { RolesSection } from '../components/home/RolesSection';
import { WhyChooseSection } from '../components/home/WhyChooseSection';
import { CtaSection } from '../components/home/CtaSection';
import { AboutQmicsSection } from '../components/home/AboutQmicsSection';
import { HomeFooter } from '../components/home/HomeFooter';

export function HomePage() {
  return (
    <Box sx={{ position: 'relative' }}>
      <HomeAmbientBackground />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <HomeHeader />
        <HeroSection />
        <DashboardPreviewSection />
        <HowItWorksSection />

        <Box id="features">
          <FeatureSection
            eyebrow="Test Planning"
            title="Plan every cycle with intent"
            description="Test plans capture scope, strategy, and entry/exit criteria up front — with a real approval step before execution starts, not a spreadsheet nobody reopens."
            bullets={[
              'Scope, strategy, and schedule in one reviewable document',
              'Entry & exit criteria enforced before a cycle can close',
              'Test data sets and environment bookings attached to the plan',
              'Approval workflow — no plan proceeds unsigned',
            ]}
            visual={<TestPlanningVisual />}
          />
          <FeatureSection
            eyebrow="Test Case Management"
            title="Test cases built to be reused, not rewritten"
            description="Every case carries the structure a real STLC needs — and the history to prove it's been reviewed."
            bullets={[
              'Structured steps, expected results, and test data references',
              'Priority, risk, and tags for fast filtering at scale',
              'Clone, template, and bulk import/export for large suites',
              'Full version history with a review workflow before go-live',
            ]}
            visual={<TestCaseVisual />}
            reverse
          />
          <FeatureSection
            eyebrow="Test Execution"
            title="Run cycles, capture evidence, know status instantly"
            description="Executions are the moment truth enters the system — every result is logged, evidenced, and linked back to the case that produced it."
            bullets={[
              'Organize runs into test cycles and suites, assigned by tester',
              'Log Pass, Fail, Blocked, Not Run, or Retest with attached evidence',
              'Every result feeds traceability the instant it’s saved',
            ]}
            visual={<TestExecutionVisual />}
          />
          <FeatureSection
            eyebrow="Defect Management"
            title="From failed step to fixed build, fully tracked"
            description="A failed execution doesn't just sit in a spreadsheet — it becomes a defect with a real lifecycle and a straight line back to what it broke."
            bullets={[
              'Full lifecycle: New → Assigned → In Progress → Retest → Closed',
              'Plus Rejected, Duplicate, Deferred, Reopened, Cannot Reproduce',
              'Linked directly to the execution and requirement that raised it',
            ]}
            visual={<DefectVisual />}
            reverse
          />
          <FeatureSection
            eyebrow="Reports & Analytics"
            title="A release quality score you don't calculate by hand"
            description="The traceability matrix joins requirement, scenario, case, execution, and defect automatically — and rolls it up into one go / no-go signal."
            bullets={[
              'Traceability matrix generated from live data, not a manual join',
              'Release Quality Score: coverage %, pass %, and open critical defects',
              'Ready / Conditional / Not-Ready — a call, not just a chart',
            ]}
            visual={<ReportsVisual />}
          />
          <FeatureSection
            eyebrow="Workflow & Approvals"
            title="Sign-off that fits how your team actually works"
            description="Approval steps for requirements, test plans, test cases, and defects are configurable — not hardcoded into a process that doesn't match yours."
            bullets={[
              'Configurable approval chains per artifact type',
              'Every approval is itself an audited, timestamped event',
            ]}
            visual={<WorkflowVisual />}
            reverse
          />
        </Box>

        <StatsStrip />
        <RolesSection />
        <WhyChooseSection />
        <CtaSection />
        <AboutQmicsSection />
        <HomeFooter />
      </Box>
    </Box>
  );
}
