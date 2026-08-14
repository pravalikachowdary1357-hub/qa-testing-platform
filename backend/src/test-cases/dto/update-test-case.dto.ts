import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { TestCasePriority, TestCaseStatus } from '../../../generated/prisma/enums.js';
import { TestCaseStepInputDto } from './test-case-step-input.dto';

export class UpdateTestCaseDto {
  @IsOptional()
  @IsUUID()
  testScenarioId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  preconditions?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  expectedResult?: string;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  // When provided, replaces the full step list; when omitted, existing steps are left untouched.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestCaseStepInputDto)
  steps?: TestCaseStepInputDto[];
}
