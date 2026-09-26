import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { DASHBOARD_SECTIONS } from '../admin-config.constants';
import type { DashboardSection } from '../admin-config.constants';

export class UpdateDashboardConfigDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(DASHBOARD_SECTIONS, { each: true })
  hiddenSections: DashboardSection[];

  // When set, saves a per-role override instead of the global layout.
  @IsOptional()
  @IsUUID('4')
  roleId?: string;
}
