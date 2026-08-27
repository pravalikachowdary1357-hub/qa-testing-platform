import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DefectPriority, DefectSeverity, DefectStatus } from '../../../generated/prisma/enums.js';

export class CreateDefectDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @IsOptional()
  @IsUUID()
  testExecutionId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  stepsToReproduce: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;

  @IsString()
  @IsNotEmpty()
  actualResult: string;

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
