import { Box } from '@mui/material';
import { HomeAmbientBackground } from '../components/home/HomeAmbientBackground';
import { HomeHeader } from '../components/home/HomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { CapabilitiesSection } from '../components/home/CapabilitiesSection';
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
        <HowItWorksSection />
        <CapabilitiesSection />
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
