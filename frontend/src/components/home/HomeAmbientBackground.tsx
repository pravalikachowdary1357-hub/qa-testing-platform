import { Box } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import DescriptionIcon from '@mui/icons-material/Description';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { floatY } from '../../utils/motion';
import { AmbientBlobs } from './AmbientBlobs';

// The exact same gradient + drifting blobs + floating icons as the login
// page's background (see LoginPage.tsx), fixed to the viewport so it stays
// visible behind every section as the home page scrolls -- one shared
// backdrop instead of a different treatment per section.
const FLOATING_ICONS = [
  { Icon: BugReportIcon, top: '9%', left: '2.5%', delay: '0s', duration: '6s' },
  { Icon: DescriptionIcon, top: '8%', left: '96%', delay: '0.6s', duration: '7s' },
  { Icon: ShieldOutlinedIcon, top: '32%', left: '97%', delay: '1.2s', duration: '5.5s' },
  { Icon: TrendingUpIcon, top: '92%', left: '95%', delay: '0.3s', duration: '6.5s' },
  { Icon: AutorenewIcon, top: '55%', left: '1.5%', delay: '0.9s', duration: '7.5s' },
  { Icon: FactCheckIcon, top: '78%', left: '2%', delay: '1.5s', duration: '6.8s' },
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
          { top: '-12%', left: '-8%', size: 440, color: 'rgba(33,150,243,0.35)', duration: '18s' },
          { bottom: '-14%', right: '-8%', size: 520, color: 'rgba(3,169,244,0.30)', duration: '22s' },
          { top: '32%', left: '58%', size: 340, color: 'rgba(129,212,250,0.40)', duration: '16s' },
          { top: '65%', left: '12%', size: 260, color: 'rgba(2,119,189,0.25)', duration: '20s' },
        ]}
      />
      {FLOATING_ICONS.map(({ Icon, top, left, delay, duration }, i) => (
        <Icon
          key={i}
          sx={{
            position: 'absolute',
            top,
            left,
            fontSize: 32,
            color: 'rgba(15,76,129,0.16)',
            animation: `${floatY} ${duration} ease-in-out ${delay} infinite`,
          }}
        />
      ))}
    </Box>
  );
}
