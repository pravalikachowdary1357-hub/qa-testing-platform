import type { ReactElement } from 'react';
import type SvgIcon from '@mui/material/SvgIcon';

export interface NavItemConfig {
  path: string;
  label: string;
  icon: typeof SvgIcon;
  element: ReactElement;
}
