import type { ReactElement } from 'react';
import type SvgIcon from '@mui/material/SvgIcon';

export interface NavItemConfig {
  path: string;
  label: string;
  icon: typeof SvgIcon;
  element: ReactElement;
  // The ":read" permission required to see and open this module. Omitted
  // for Dashboard, which every role can see (it's an unguarded aggregate
  // view, not backed by its own permissioned controller).
  permission?: string;
}
