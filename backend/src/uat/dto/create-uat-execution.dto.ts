import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UatExecutionStatus } from '../../../generated/prisma/enums.js';

export class CreateUatExecutionDto {
  @IsUUID()
  environmentId: string;

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

  // Free-text reference (a URL or a description) to supporting evidence --
  // this app has no file-upload/blob-storage infrastructure, so a real
  // attachment isn't possible; this is the honest substitute the existing
  // architecture actually supports.
  @IsOptional()
  @IsString()
  evidence?: string;

  @IsString()
  @IsNotEmpty()
  executedBy: string;

  @IsOptional()
  @IsDateString()
  executedAt?: string;
}
