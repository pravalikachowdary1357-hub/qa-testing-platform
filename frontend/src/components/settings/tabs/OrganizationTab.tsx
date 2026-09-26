import { CurrentOrganizationProfile } from '../../organization/CurrentOrganizationProfile';

// Settings > Organization shows the same profile as the Organization page:
// logo, Org ID / Code / Name / Location / Established Year / Email,
// documents and Save Organization.
export function OrganizationTab() {
  return <CurrentOrganizationProfile />;
}
