import { Box, Button, Typography } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import qmicsLogo from '../../assets/qmics-logo.png';
import { floatY } from '../../utils/motion';

export function AboutQmicsSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#0B1F2A',
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
        <Box
          component="img"
          src={qmicsLogo}
          alt="QMICS"
          sx={{ width: 120, height: 'auto', mx: 'auto', mb: 4, display: 'block' }}
        />

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
