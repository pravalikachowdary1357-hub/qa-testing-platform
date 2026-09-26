import { PageHeader } from '../components/common/PageHeader';
import { CurrentOrganizationProfile } from '../components/organization/CurrentOrganizationProfile';

export function OrganizationsPage() {
  return (
    <>
      <PageHeader title="Organization" subtitle="Your organization's profile, logo and documents" />
      <CurrentOrganizationProfile />
    </>
  );
}
