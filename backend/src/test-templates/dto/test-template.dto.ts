import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TestCasePriority } from '../../../generated/prisma/enums.js';

export class TemplateStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  action: string;

  @IsString()
  @MaxLength(2000)
  expectedResult: string;
}

export class CreateTestTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  preconditions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  expectedResult?: string;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TemplateStepDto)
  steps: TemplateStepDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTestTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  preconditions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  expectedResult?: string;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TemplateStepDto)
  steps?: TemplateStepDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
