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

export class UpdateRequirementDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(RequirementType)
  type?: RequirementType;

  @IsOptional()
  @IsEnum(RequirementPriority)
  priority?: RequirementPriority;

  @IsOptional()
  @IsEnum(RequirementRisk)
  riskLevel?: RequirementRisk;

  // Service-level guard restricts this to DRAFT/IN_REVIEW -- APPROVED/
  // REJECTED are only reachable via POST /requirements/:id/review, which
  // also records reviewer/date/comment. See RequirementsService.update().
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  acceptanceCriteria?: string[];
}
