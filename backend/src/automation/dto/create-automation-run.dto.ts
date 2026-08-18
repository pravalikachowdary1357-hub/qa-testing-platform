import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AutomationRunStatus } from '../../../generated/prisma/enums.js';

export class CreateAutomationRunDto {
  @IsEnum(AutomationRunStatus)
  status: AutomationRunStatus;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  recordedBy: string;
}
