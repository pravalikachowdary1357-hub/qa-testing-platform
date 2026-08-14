import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TestExecutionStatus } from '../../../generated/prisma/enums.js';

export class CreateTestExecutionDto {
  @IsUUID()
  testCaseId: string;

  @IsUUID()
  environmentId: string;

  @IsOptional()
  @IsUUID()
  testDataId?: string;

  @IsOptional()
  @IsEnum(TestExecutionStatus)
  status?: TestExecutionStatus;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  executedBy: string;

  @IsOptional()
  @IsDateString()
  executedAt?: string;
}
