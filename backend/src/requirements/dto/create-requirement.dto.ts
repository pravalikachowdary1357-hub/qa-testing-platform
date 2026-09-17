import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  RequirementPriority,
  RequirementRisk,
  RequirementStatus,
  RequirementType,
} from '../../../generated/prisma/enums.js';

export class CreateRequirementDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(RequirementType)
  type?: RequirementType;

  @IsOptional()
  @IsEnum(RequirementPriority)
  priority?: RequirementPriority;

  @IsOptional()
  @IsEnum(RequirementRisk)
  riskLevel?: RequirementRisk;

  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  // Each criterion is trimmed and validated non-empty by the service before
  // being persisted -- not accepted here so a whitespace-only string still
  // fails validation the same way `title`/`description` do.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  acceptanceCriteria?: string[];
}
