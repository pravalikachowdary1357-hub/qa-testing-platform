import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ProjectStatus } from '../../../generated/prisma/enums.js';

export class UpdateProjectDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  // null explicitly clears an existing assignment; undefined/omitted leaves
  // it untouched. @IsOptional() skips @IsUUID for both null and undefined.
  @IsOptional()
  @IsUUID()
  businessUnitId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
