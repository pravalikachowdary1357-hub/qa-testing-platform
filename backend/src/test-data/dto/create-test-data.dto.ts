import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TestDataType } from '../../../generated/prisma/enums.js';

export class CreateTestDataDto {
  @IsOptional()
  @IsUUID()
  testCaseId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TestDataType)
  type?: TestDataType;

  @IsString()
  @IsNotEmpty()
  value: string;
}
