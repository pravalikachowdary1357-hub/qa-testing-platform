import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FindingSeverity, VulnerabilityStatus } from '../../../generated/prisma/enums.js';

export class CreateSecurityFindingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsString()
  @IsNotEmpty()
  recommendation: string;

  @IsOptional()
  @IsEnum(VulnerabilityStatus)
  status?: VulnerabilityStatus;
}
