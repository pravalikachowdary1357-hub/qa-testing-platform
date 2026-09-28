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

export class CreateTestPlanDto extends TestPlanGovernanceDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(TestPlanStatus)
  status?: TestPlanStatus;

  @IsOptional()
  @IsEnum(TestPlanPriority)
  priority?: TestPlanPriority;

  @IsString()
  @IsNotEmpty()
  owner: string;

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
