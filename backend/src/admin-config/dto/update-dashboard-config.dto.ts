import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { DASHBOARD_SECTIONS } from '../admin-config.constants';
import type { DashboardSection } from '../admin-config.constants';

export class UpdateDashboardConfigDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(DASHBOARD_SECTIONS, { each: true })
  hiddenSections: DashboardSection[];
}
