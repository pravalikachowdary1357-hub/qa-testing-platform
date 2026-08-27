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

export class CreateTestCaseDto {
  @IsUUID()
  testScenarioId: string;

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
  @IsString()
  preconditions?: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestCaseStepInputDto)
  steps: TestCaseStepInputDto[];
}
