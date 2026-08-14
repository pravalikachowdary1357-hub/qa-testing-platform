import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TestExecutionStatus } from '../../../generated/prisma/enums.js';

export class UpdateTestExecutionDto {
  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

  // null explicitly clears the test data link; undefined/absent leaves it untouched.
  @IsOptional()
  @IsUUID()
  testDataId?: string | null;

  @IsOptional()
  @IsEnum(TestExecutionStatus)
  status?: TestExecutionStatus;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  executedBy?: string;

  @IsOptional()
  @IsDateString()
  executedAt?: string;
}
