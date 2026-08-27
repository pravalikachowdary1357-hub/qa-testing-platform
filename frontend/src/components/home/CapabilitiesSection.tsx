import { Box, Grid, Paper, Typography } from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import BugReportIcon from '@mui/icons-material/BugReport';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Api';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RuleIcon from '@mui/icons-material/Rule';

const CAPABILITIES = [
  {
    title: 'Test Planning',
    description: 'Plan scope, strategy, schedules, entry/exit criteria, environments, test data, and approvals.',
    icon: EventNoteIcon,
  },
  {
    title: 'Test Case Management',
    description: 'Create reusable test cases with steps, expected results, priority, risk, tags, versions, and review history.',
    icon: FactCheckIcon,
  },
  {
    title: 'Test Execution',
    description: 'Run test cycles and suites, assign testers, capture results, and attach evidence.',
    icon: PlayCircleIcon,
  },
  {
    title: 'Defect Management',
    description: 'Track defects from discovery through assignment, investigation, retest, and closure.',
    icon: BugReportIcon,
  },
  {
    title: 'Automation Testing',
    description: 'Connect automated testing with the same test cases, executions, results, and defects.',
    icon: SmartToyIcon,
  },
  {
    title: 'API Testing',
    description: 'Manage API tests, requests, responses, validations, authentication, and execution results.',
    icon: ApiIcon,
  },
  {
    title: 'Performance Testing',
    description: 'Track load, stress, response time, throughput, and performance results.',
    icon: SpeedIcon,
  },
  {
    title: 'Security Testing',
    description: 'Manage security test cases, vulnerabilities, authentication, authorization, and security defects.',
    icon: SecurityIcon,
  },
  {
    title: 'UAT',
    description: 'Manage business acceptance, UAT execution, approvals, sign-off, and UAT defects.',
    icon: HowToRegIcon,
  },
  {
    title: 'Traceability',
    description: 'Connect requirements, scenarios, cases, executions, defects, retests, and releases.',
    icon: AccountTreeIcon,
  },
  {
    title: 'Release Quality',
    description: 'Combine testing results, coverage, defects, automation, security, performance, and UAT into release-readiness decisions.',
    icon: WorkspacePremiumIcon,
  },
  {
    title: 'Reports & Analytics',
    description: 'Turn QA data into coverage, execution, defect, trend, and release-quality insights.',
    icon: InsightsIcon,
  },
  {
    title: 'AI Assistance',
    description: 'Assist with test generation, analysis, coverage, risk identification, defect analysis, and quality insights without making AI a dependency.',
    icon: AutoAwesomeIcon,
  },
  {
    title: 'Workflow & Approvals',
    description: 'Provide controlled approvals with complete audit history.',
    icon: RuleIcon,
  },
];

export function CapabilitiesSection() {
  return (
    <Box id="features" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            Core Capabilities
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Everything the test lifecycle needs, in one platform
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <Grid key={c.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3, borderColor: 'divider' }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: 'rgba(15,76,129,0.08)',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.description}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}
