import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UatTestCaseStepInputDto } from './uat-test-case-step-input.dto';

export class UpdateUatTestCaseDto {
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assignedTester?: string;

  // When provided, replaces the full step list; when omitted, existing steps are left untouched.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UatTestCaseStepInputDto)
  steps?: UatTestCaseStepInputDto[];
}
