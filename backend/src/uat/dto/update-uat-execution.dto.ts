import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UatExecutionStatus } from '../../../generated/prisma/enums.js';

export class UpdateUatExecutionDto {
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @IsOptional()
  @IsUUID()
  defectId?: string;

  @IsOptional()
  @IsEnum(UatExecutionStatus)
  status?: UatExecutionStatus;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  executedBy?: string;

  @IsOptional()
  @IsDateString()
  executedAt?: string;
}
