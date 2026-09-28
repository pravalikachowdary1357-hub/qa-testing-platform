import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TestPlanPriority, TestPlanStatus } from '../../../generated/prisma/enums.js';
import { TestPlanGovernanceDto } from './test-plan-governance.dto';

export class UpdateTestPlanDto extends TestPlanGovernanceDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(TestPlanStatus)
  status?: TestPlanStatus;

  @IsOptional()
  @IsEnum(TestPlanPriority)
  priority?: TestPlanPriority;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  owner?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  requirementIds?: string[];
}
