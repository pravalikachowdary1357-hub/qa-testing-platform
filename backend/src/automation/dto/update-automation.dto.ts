import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AutomationFramework, AutomationType } from '../../../generated/prisma/enums.js';

export class UpdateAutomationDto {
  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(AutomationType)
  type?: AutomationType;

  @IsOptional()
  @IsEnum(AutomationFramework)
  framework?: AutomationFramework;

  @IsOptional()
  @IsString()
  description?: string;

  // Free text, e.g. "Nightly at 2am" or "On every deploy" -- there is no real
  // job scheduler behind this field, it is descriptive metadata only.
  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
