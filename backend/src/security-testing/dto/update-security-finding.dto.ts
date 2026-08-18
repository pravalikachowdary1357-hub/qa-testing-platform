import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FindingSeverity, VulnerabilityStatus } from '../../../generated/prisma/enums.js';

export class UpdateSecurityFindingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recommendation?: string;

  @IsOptional()
  @IsEnum(VulnerabilityStatus)
  status?: VulnerabilityStatus;
}
