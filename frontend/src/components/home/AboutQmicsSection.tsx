import { Box, Button, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import TerminalIcon from '@mui/icons-material/Terminal';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { floatY } from '../../utils/motion';

export function AboutQmicsSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#0B1F2A',
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, #2E8B99 0%, rgba(46,139,153,0) 55%)',
        backgroundSize: '22px 22px, 100% 4px',
        backgroundPosition: '0 0, 0 0',
        backgroundRepeat: 'repeat, no-repeat',
      }}
    >
      <TerminalIcon
        aria-hidden
        sx={{
          position: 'absolute',
          top: 32,
          left: { xs: 16, md: 48 },
          fontSize: 26,
          color: 'rgba(255,255,255,0.18)',
          animation: `${floatY} 6.5s ease-in-out infinite`,
        }}
      />
      <AutorenewIcon
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: 32,
          right: { xs: 16, md: 48 },
          fontSize: 30,
          color: 'rgba(255,255,255,0.18)',
          animation: `${floatY} 8s ease-in-out infinite 0.5s`,
        }}
      />

      <Box sx={{ position: 'relative', maxWidth: 760, mx: 'auto', px: { xs: 3, md: 4 }, py: { xs: 8, md: 10 }, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', width: 90, height: 90, mx: 'auto', mb: 2.5 }}>
          <Box
            component="svg"
            viewBox="0 0 100 100"
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <polygon points="50,6 94,90 6,90" fill="none" stroke="#2E8B99" strokeWidth="4" strokeLinejoin="round" />
          </Box>
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '60%',
              transform: 'translate(-50%, -50%)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              bgcolor: '#0B1F2A',
              border: '4px solid #2E8B99',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon sx={{ color: '#F2B705', fontSize: 28 }} />
          </Box>
        </Box>
        <Typography sx={{ fontWeight: 800, letterSpacing: 3, color: '#4FB3C2', fontSize: '0.95rem', mb: 4 }}>
          QMICS
        </Typography>

        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 1.5, fontSize: { xs: '1.6rem', md: '2rem' } }}>
          About QMICS Solutions
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#F2B705', mb: 3, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
          Driving Quality Through Innovation
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)', mb: 4, lineHeight: 1.8 }}>
          QMICS Solutions is a technology-driven company specializing in Quality Management, Compliance, Laboratory,
          Audit, Learning, and Enterprise Management solutions. We develop intelligent software platforms that help
          organizations simplify operations, improve compliance, enhance productivity, and accelerate digital
          transformation across industries. Our integrated ecosystem combines modern technologies, automation, and
          AI to deliver reliable, scalable, and user-friendly business solutions.
        </Typography>

        <Button
          component="a"
          href="https://qmicssolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.4)',
            fontWeight: 700,
            px: 3,
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          Visit qmicssolutions.com
        </Button>
      </Box>
    </Box>
  );
}
