import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { BuildStatus } from '../../../generated/prisma/enums.js';

export class CreateBuildDto {
  @IsUUID()
  releaseId: string;

  @IsString()
  @IsNotEmpty()
  buildNumber: string;

  @IsOptional()
  @IsEnum(BuildStatus)
  status?: BuildStatus;

  @IsOptional()
  @IsDateString()
  buildDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
