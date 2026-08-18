import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  EnvironmentType,
  TestCasePriority,
  DefectSeverity,
} from '../../../generated/prisma/enums.js';

export class UpdateAppSettingsDto {
  @IsOptional()
  @IsEnum(EnvironmentType)
  defaultEnvironmentType?: EnvironmentType;

  @IsOptional()
  @IsEnum(TestCasePriority)
  defaultTestCasePriority?: TestCasePriority;

  @IsOptional()
  @IsEnum(DefectSeverity)
  defaultDefectSeverity?: DefectSeverity;

  @IsOptional()
  @IsBoolean()
  notifyOnDefectCreated?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnReleaseReadinessChange?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnTestExecutionFailure?: boolean;
}
