import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MailOutlineIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import CodeIcon from '@mui/icons-material/Code';
import FlagCircleIcon from '@mui/icons-material/FlagCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import BugReportIcon from '@mui/icons-material/BugReport';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import HistoryIcon from '@mui/icons-material/History';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useAuth } from '../context/AuthContext';
import testSphereLogo from '../assets/testsphere-logo.png';
import { drift1, drift2, drift3, floatY } from '../utils/motion';

const DEMO_PASSWORD = 'ChangeMe123!';

interface DemoAccount {
  role: string;
  email: string;
  description: string;
  icon: typeof AdminPanelSettingsIcon;
  color: string;
}

// Mirrors the 9 real seeded roles/users in backend/prisma/seed.cjs -- same
// emails, same default password, same role descriptions. These are genuine
// accounts in this database, not placeholders. Evolved from the earlier
// 6-role model: Automation Engineer and UAT Coordinator / Business Tester
// are newly split out (from Tester and Business/Release Approver
// respectively), and Database Test Engineer is reserved for a future
// database-testing module -- that account currently has zero granted
// permissions by design, not a bug.
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'System Administrator',
    email: 'admin@testsphere.local',
    description: 'Platform administration: organizations, users, roles, and system/audit settings. No QA testing execution, planning, or governance.',
    icon: AdminPanelSettingsIcon,
    color: '#0F4C81',
  },
  {
    role: 'Test Manager / Test Program Manager',
    email: 'qa.manager@testsphere.local',
    description: 'Overall testing owner: full authority across the whole testing lifecycle, including automation, performance, security, UAT, release quality, and AI.',
    icon: AssignmentIndIcon,
    color: '#5E35B1',
  },
  {
    role: 'Test Lead / QA Lead',
    email: 'test.manager@testsphere.local',
    description: 'Day-to-day testing management: test plans, scenarios, cases, data, environments, execution, and defects.',
    icon: AssignmentTurnedInIcon,
    color: '#EF6C00',
  },
  {
    role: 'Tester / Test Engineer / QA Engineer',
    email: 'tester@testsphere.local',
    description: 'Creates/executes test cases, records evidence, raises and updates defects, executes UAT, and performs assigned specialized testing.',
    icon: ScienceIcon,
    color: '#2E7D32',
  },
  {
    role: 'Automation Engineer',
    email: 'automation.engineer@testsphere.local',
    description: 'Owns test automation: develops/maintains frameworks and scripts, executes automated regression, analyzes failures.',
    icon: SmartToyIcon,
    color: '#00838F',
  },
  {
    role: 'Database Test Engineer',
    email: 'database.engineer@testsphere.local',
    description: 'Reserved for a future database-testing capability -- no TestSphere module exists for this yet, so this account currently has no granted permissions.',
    icon: StorageIcon,
    color: '#6D4C41',
  },
  {
    role: 'Developer',
    email: 'developer@testsphere.local',
    description: 'Investigates and fixes defects (root cause, corrective action, ready-for-retest); views requirements, test results, UAT, and release status.',
    icon: CodeIcon,
    color: '#D84315',
  },
  {
    role: 'UAT Coordinator / Business Tester',
    email: 'uat.coordinator@testsphere.local',
    description: 'Coordinates and executes User Acceptance Testing; records business-user feedback. Does not hold final UAT approval authority.',
    icon: HowToRegIcon,
    color: '#AD1457',
  },
  {
    role: 'Product Owner / Release Approver',
    email: 'business.approver@testsphere.local',
    description: 'Business acceptance and release decision authority: owns requirements, approves UAT results, and approves release readiness.',
    icon: FlagCircleIcon,
    color: '#C9A227',
  },
];

const FEATURE_PILLS = [
  { label: 'Requirements Management', icon: DescriptionIcon },
  { label: 'Test Case Management', icon: FactCheckIcon },
  { label: 'Defect Tracking', icon: BugReportIcon },
  { label: 'Test Execution', icon: PlayCircleIcon },
  { label: 'Role-Based Access', icon: ShieldOutlinedIcon },
  { label: 'Audit Trail', icon: HistoryIcon },
];

export function LoginPage() {
  const { user, authLoading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'signin' | 'demo'>(searchParams.get('demo') ? 'demo' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  const doLogin = async (loginEmail: string, loginPassword: string, rememberSession: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(loginEmail, loginPassword, rememberSession);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void doLogin(email, password, remember);
  };

  const handleUseDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setView('signin');
    void doLogin(account.email, DEMO_PASSWORD, remember);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #EAF4FD 0%, #D3E9FA 45%, #BFE0F5 100%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '-12%',
          left: '-8%',
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(33,150,243,0.35) 0%, rgba(33,150,243,0) 70%)',
          animation: `${drift1} 18s ease-in-out infinite`,
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: '-14%',
          right: '-8%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(3,169,244,0.30) 0%, rgba(3,169,244,0) 70%)',
          animation: `${drift2} 22s ease-in-out infinite`,
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '32%',
          left: '58%',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,212,250,0.40) 0%, rgba(129,212,250,0) 70%)',
          animation: `${drift3} 16s ease-in-out infinite`,
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '65%',
          left: '12%',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2,119,189,0.25) 0%, rgba(2,119,189,0) 70%)',
          animation: `${drift3} 20s ease-in-out infinite`,
          zIndex: 0,
        }}
      />

      {[
        { Icon: BugReportIcon, top: '9%', left: '2.5%', delay: '0s', duration: '6s' },
        { Icon: DescriptionIcon, top: '8%', left: '96%', delay: '0.6s', duration: '7s' },
        { Icon: ShieldOutlinedIcon, top: '32%', left: '97%', delay: '1.2s', duration: '5.5s' },
        { Icon: TrendingUpIcon, top: '92%', left: '95%', delay: '0.3s', duration: '6.5s' },
        { Icon: AutorenewIcon, top: '55%', left: '1.5%', delay: '0.9s', duration: '7.5s' },
        { Icon: FactCheckIcon, top: '78%', left: '2%', delay: '1.5s', duration: '6.8s' },
      ].map(({ Icon, top, left, delay, duration }, i) => (
        <Icon
          key={i}
          aria-hidden
          sx={{
            position: 'absolute',
            top,
            left,
            fontSize: 32,
            color: 'rgba(15,76,129,0.18)',
            animation: `${floatY} ${duration} ease-in-out ${delay} infinite`,
            zIndex: 0,
          }}
        />
      ))}

      <Button
        component="a"
        href="/"
        startIcon={<HomeIcon />}
        sx={{
          position: 'absolute',
          top: 24,
          left: 24,
          zIndex: 2,
          bgcolor: 'background.paper',
          borderRadius: 10,
          px: 2,
          boxShadow: 1,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        Home
      </Button>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 3, md: view === 'signin' ? 3 : 0 },
          maxWidth: view === 'signin' ? 1080 : 1200,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 6,
        }}
      >
        {view === 'signin' ? (
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 440,
              flex: '0 1 440px',
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(15, 76, 129, 0.15)',
            }}
          >
            <Box sx={{ height: 6, background: 'linear-gradient(90deg, #00897B 0%, #0F4C81 50%, #F2B705 100%)' }} />
            <Box sx={{ p: { xs: 3, sm: 5 } }}>
              <Stack spacing={3} component="form" onSubmit={handleSubmit}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box component="img" src={testSphereLogo} alt="TestSphere" sx={{ height: 36, width: 'auto', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Welcome back
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Sign in to your TestSphere dashboard
                  </Typography>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutlineIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            size="small"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Remember me</Typography>}
                  />
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    underline="hover"
                    onClick={() =>
                      setInfoMessage('Contact your System Administrator to reset your password.')
                    }
                  >
                    Forgot password?
                  </Link>
                </Stack>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  color="primary"
                  disabled={submitting}
                  endIcon={<ArrowForwardIcon />}
                  fullWidth
                  sx={{ py: 1.25, fontWeight: 600 }}
                >
                  {submitting ? 'Signing in…' : 'Sign In'}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => {
                    setError(null);
                    setView('demo');
                  }}
                  sx={{
                    borderColor: '#F2B705',
                    color: '#8A6D00',
                    bgcolor: '#FEF9E7',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#F2B705', bgcolor: '#FDF3D0' },
                  }}
                >
                  View Demo Accounts
                </Button>

                <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                  <ShieldOutlinedIcon sx={{ fontSize: 14 }} color="disabled" />
                  <Typography variant="caption" color="text.secondary">
                    Secured · Session &amp; RBAC protected
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ width: '100%', maxWidth: 1200 }}>
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => setView('signin')}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 3, fontWeight: 600 }}
            >
              <ArrowBackIcon fontSize="small" /> Back to Sign In
            </Link>

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Demo Credentials
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640, mx: 'auto' }}>
                Explore TestSphere using the {DEMO_ACCOUNTS.length} pre-configured demo accounts seeded in this
                database. Select any role below to sign in instantly with the appropriate permissions.
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {DEMO_ACCOUNTS.map((account) => {
                const RoleIcon = account.icon;
                return (
                  <Grid key={account.email} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderColor: `${account.color}55`,
                        borderRadius: 3,
                        bgcolor: `${account.color}08`,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                        <Avatar sx={{ bgcolor: `${account.color}22`, color: account.color, width: 40, height: 40 }}>
                          <RoleIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {account.role}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        {account.description}
                      </Typography>
                      <Stack spacing={0.75} sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                          <MailOutlineIcon sx={{ fontSize: 16, mt: '2px', flexShrink: 0 }} color="disabled" />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', minWidth: 0 }}>
                            {account.email}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <LockOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} color="disabled" />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', minWidth: 0 }}>
                            {DEMO_PASSWORD}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Button
                        variant="outlined"
                        endIcon={<ArrowForwardIcon />}
                        disabled={submitting}
                        onClick={() => handleUseDemoAccount(account)}
                        sx={{ borderColor: account.color, color: account.color, '&:hover': { borderColor: account.color, bgcolor: `${account.color}14` } }}
                      >
                        Use these credentials
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {view === 'signin' && (
        <Box
          sx={{
            flex: '1 1 460px',
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          position: 'relative',
          pl: { md: 2 },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 70% 50%, rgba(15,76,129,0.06) 0%, transparent 60%)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, fontStyle: 'italic', mb: 2 }}
          >
            <Box component="span" sx={{ color: '#0F4C81' }}>Test</Box>
            <Box component="span" sx={{ color: '#F2B705' }}>Sphere</Box>
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 3 }}>
            <Box component="span" sx={{ color: '#0F4C81' }}>The complete </Box>
            <Box component="span" sx={{ color: '#F2B705' }}>test management</Box>
            <Box component="span" sx={{ color: '#0F4C81' }}> &amp; QA platform.</Box>
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
            Plan. Execute. Trace. Ship with confidence.
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            {FEATURE_PILLS.map(({ label, icon: Icon }) => (
              <Chip
                key={label}
                icon={<Icon fontSize="small" sx={{ color: '#0F4C81 !important' }} />}
                label={label}
                sx={{ bgcolor: 'background.paper', boxShadow: 1, px: 1, py: 2.2, fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Box>
      </Box>
      )}
      </Box>

      <Snackbar
        open={Boolean(infoMessage)}
        autoHideDuration={4000}
        onClose={() => setInfoMessage(null)}
        message={infoMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
