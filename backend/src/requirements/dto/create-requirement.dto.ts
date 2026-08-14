import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from '../../../generated/prisma/enums.js';

export class CreateRequirementDto {
  @IsUUID()
  productId: string;

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
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;
}
