import { Box } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import DescriptionIcon from '@mui/icons-material/Description';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { floatY } from '../../utils/motion';
import { AmbientBlobs } from './AmbientBlobs';

// The exact same gradient + drifting blobs + floating icons as the login
// page's background (see LoginPage.tsx), fixed to the viewport so it stays
// visible behind every section as the home page scrolls -- one shared
// backdrop instead of a different treatment per section.
const FLOATING_ICONS = [
  { Icon: BugReportIcon, top: '9%', left: '2.5%', delay: '0s', duration: '3.5s' },
  { Icon: DescriptionIcon, top: '8%', left: '96%', delay: '0.6s', duration: '4s' },
  { Icon: ShieldOutlinedIcon, top: '32%', left: '97%', delay: '1.2s', duration: '3s' },
  { Icon: TrendingUpIcon, top: '92%', left: '95%', delay: '0.3s', duration: '3.8s' },
  { Icon: AutorenewIcon, top: '55%', left: '1.5%', delay: '0.9s', duration: '4.2s' },
  { Icon: FactCheckIcon, top: '78%', left: '2%', delay: '1.5s', duration: '3.6s' },
  { Icon: SpeedIcon, top: '18%', left: '14%', delay: '0.4s', duration: '4.4s' },
  { Icon: SecurityIcon, top: '14%', left: '82%', delay: '1.1s', duration: '3.9s' },
  { Icon: CodeIcon, top: '42%', left: '8%', delay: '1.8s', duration: '4.6s' },
  { Icon: StorageIcon, top: '46%', left: '90%', delay: '0.2s', duration: '4.1s' },
  { Icon: RocketLaunchIcon, top: '66%', left: '88%', delay: '1.4s', duration: '3.7s' },
  { Icon: AssignmentTurnedInIcon, top: '86%', left: '16%', delay: '0.7s', duration: '4.3s' },
  { Icon: AccountTreeIcon, top: '28%', left: '48%', delay: '2s', duration: '4.8s' },
  { Icon: PlaylistAddCheckIcon, top: '74%', left: '56%', delay: '1s', duration: '4s' },
  { Icon: BugReportIcon, top: '60%', left: '30%', delay: '1.6s', duration: '4.5s' },
  { Icon: SpeedIcon, top: '90%', left: '72%', delay: '0.5s', duration: '3.4s' },
];

export function HomeAmbientBackground() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, #EAF4FD 0%, #D3E9FA 45%, #BFE0F5 100%)',
      }}
    >
      <AmbientBlobs
        blobs={[
          { top: '-12%', left: '-8%', size: 440, color: 'rgba(33,150,243,0.55)', duration: '9s' },
          { bottom: '-14%', right: '-8%', size: 520, color: 'rgba(3,169,244,0.50)', duration: '11s' },
          { top: '32%', left: '58%', size: 340, color: 'rgba(129,212,250,0.65)', duration: '8s' },
          { top: '65%', left: '12%', size: 260, color: 'rgba(2,119,189,0.45)', duration: '10s' },
        ]}
      />
      {FLOATING_ICONS.map(({ Icon, top, left, delay, duration }, i) => (
        <Icon
          key={i}
          sx={{
            position: 'absolute',
            top,
            left,
            fontSize: 44,
            color: 'rgba(15,76,129,0.30)',
            animation: `${floatY} ${duration} ease-in-out ${delay} infinite`,
          }}
        />
      ))}
    </Box>
  );
}
