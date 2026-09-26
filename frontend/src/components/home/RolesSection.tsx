import { Avatar, Box, Grid, Paper, Stack, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ScienceIcon from '@mui/icons-material/Science';
import CodeIcon from '@mui/icons-material/Code';
import FlagCircleIcon from '@mui/icons-material/FlagCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import HowToRegIcon from '@mui/icons-material/HowToReg';

// Mirrors the 9 real seeded roles in backend/prisma/seed.cjs (see also
// DEMO_ACCOUNTS in LoginPage.tsx) -- names, descriptions, and colors stay in
// sync with what a visitor will actually see after signing in.
const ROLES = [
  {
    role: 'System Administrator',
    description: 'Platform administration: organizations, users, roles, and system/audit settings.',
    icon: AdminPanelSettingsIcon,
    color: '#0F4C81',
  },
  {
    role: 'Test Manager',
    description: 'Overall testing owner: full authority across the whole testing lifecycle, including automation, performance, security, UAT, release quality, and AI.',
    icon: AssignmentIndIcon,
    color: '#5E35B1',
  },
  {
    role: 'Test Lead',
    description: 'Day-to-day testing management: test plans, scenarios, cases, data, environments, execution, and defects.',
    icon: AssignmentTurnedInIcon,
    color: '#EF6C00',
  },
  {
    role: 'Tester',
    description: 'Creates/executes test cases, records evidence, raises and updates defects, executes UAT.',
    icon: ScienceIcon,
    color: '#2E7D32',
  },
  {
    role: 'Automation Engineer',
    description: 'Owns test automation: frameworks, scripts, automated regression runs, and failure analysis.',
    icon: SmartToyIcon,
    color: '#00838F',
  },
  {
    role: 'Database Test Engineer',
    description: 'Reserved for the upcoming database-testing capability: schema, data integrity, ETL, and stored procedures.',
    icon: StorageIcon,
    color: '#6D4C41',
  },
  {
    role: 'Developer',
    description: 'Investigates and fixes defects (root cause, corrective action, ready-for-retest); views requirements, test results, UAT, and release status.',
    icon: CodeIcon,
    color: '#D84315',
  },
  {
    role: 'UAT Coordinator',
    description: 'Coordinates and executes User Acceptance Testing and records business-user feedback.',
    icon: HowToRegIcon,
    color: '#AD1457',
  },
  {
    role: 'Product Owner',
    description: 'Business acceptance and release decision authority: owns requirements, approves UAT results and release readiness.',
    icon: FlagCircleIcon,
    color: '#C9A227',
  },
];

export function RolesSection() {
  return (
    <Box id="user-roles" sx={{ py: { xs: 8, md: 12 } }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            User roles
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Real RBAC, not a single shared login
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Six built-in roles map access to responsibility, backed by a permission system under the hood — not just
            a label on a user record. Each one grants exactly what that job needs to do, not just what it can see.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {ROLES.map((r) => {
            const RoleIcon = r.icon;
            return (
              <Grid key={r.role} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 3,
                    borderColor: `${r.color}55`,
                    bgcolor: `${r.color}08`,
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: `${r.color}22`, color: r.color, width: 40, height: 40 }}>
                      <RoleIcon fontSize="small" />
                    </Avatar>
                    <Typography sx={{ fontWeight: 700 }}>{r.role}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {r.description}
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
