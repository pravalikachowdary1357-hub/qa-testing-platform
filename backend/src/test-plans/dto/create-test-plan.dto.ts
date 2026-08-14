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

export class CreateTestPlanDto {
  @IsUUID()
  productId: string;

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
