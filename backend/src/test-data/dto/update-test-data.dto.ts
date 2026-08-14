import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TestDataType } from '../../../generated/prisma/enums.js';

export class UpdateTestDataDto {
  // null explicitly clears the test case link; undefined/absent leaves it untouched.
  @IsOptional()
  @IsUUID()
  testCaseId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TestDataType)
  type?: TestDataType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  value?: string;
}
