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

export class CreateUatTestCaseDto {
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;

  @IsString()
  @IsNotEmpty()
  assignedTester: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UatTestCaseStepInputDto)
  steps: UatTestCaseStepInputDto[];
}
