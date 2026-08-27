import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { SecurityTestType } from '../../../generated/prisma/enums.js';

// `status` is deliberately absent here -- it can only change via the
// dedicated execute()/complete() actions, never a direct PATCH, so a client
// can't fake a PASSED/FAILED result without actually going through them
// (the same rule Automation applies to `lastRunStatus`).
export class UpdateSecurityTestDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

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
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  target?: string;

  @IsOptional()
  @IsEnum(SecurityTestType)
  testType?: SecurityTestType;

  @IsOptional()
  @IsString()
  configuration?: string;
}
