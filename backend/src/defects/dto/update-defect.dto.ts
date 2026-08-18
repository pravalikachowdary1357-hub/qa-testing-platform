import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DefectPriority, DefectSeverity, DefectStatus } from '../../../generated/prisma/enums.js';

export class UpdateDefectDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  // null explicitly clears the environment link; undefined/absent leaves it untouched.
  @IsOptional()
  @IsUUID()
  environmentId?: string | null;

  // null explicitly clears the test case link; undefined/absent leaves it untouched.
  @IsOptional()
  @IsUUID()
  testCaseId?: string | null;

  // null explicitly clears the test execution link; undefined/absent leaves it untouched.
  @IsOptional()
  @IsUUID()
  testExecutionId?: string | null;

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
  @IsNotEmpty()
  stepsToReproduce?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  actualResult?: string;

  @IsOptional()
  @IsEnum(DefectSeverity)
  severity?: DefectSeverity;

  @IsOptional()
  @IsEnum(DefectPriority)
  priority?: DefectPriority;

  @IsOptional()
  @IsEnum(DefectStatus)
  status?: DefectStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}
