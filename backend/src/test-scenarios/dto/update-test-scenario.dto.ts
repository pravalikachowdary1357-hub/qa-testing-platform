import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  TestScenarioPriority,
  TestScenarioStatus,
  TestScenarioType,
} from '../../../generated/prisma/enums.js';

export class UpdateTestScenarioDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  // null explicitly clears the requirement link; undefined/absent leaves it untouched.
  @IsOptional()
  @IsUUID()
  requirementId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(TestScenarioType)
  type?: TestScenarioType;

  @IsOptional()
  @IsEnum(TestScenarioPriority)
  priority?: TestScenarioPriority;

  @IsOptional()
  @IsEnum(TestScenarioStatus)
  status?: TestScenarioStatus;
}
