import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { SecurityTestType } from '../../../generated/prisma/enums.js';

export class CreateSecurityTestDto {
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

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  target: string;

  @IsOptional()
  @IsEnum(SecurityTestType)
  testType?: SecurityTestType;

  @IsOptional()
  @IsString()
  configuration?: string;
}
