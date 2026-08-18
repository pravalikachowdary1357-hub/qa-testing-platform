import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  DefectPriority,
  DefectSeverity,
  TestCasePriority,
  TestDataType,
  TestScenarioPriority,
  TestScenarioType,
} from '../../../generated/prisma/enums.js';

export class AcceptScenarioItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(TestScenarioType)
  type?: TestScenarioType;

  @IsOptional()
  @IsEnum(TestScenarioPriority)
  priority?: TestScenarioPriority;
}

export class AcceptScenariosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptScenarioItemDto)
  scenarios: AcceptScenarioItemDto[];

  // The frontend sets this when the user changed anything before saving,
  // so the audit trail distinguishes "accepted as-is" from "accepted after
  // editing" without guessing via a diff.
  @IsOptional()
  @IsBoolean()
  edited?: boolean;
}

export class TestCaseStepItemDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;
}

export class AcceptTestCaseItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  preconditions?: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TestCaseStepItemDto)
  steps: TestCaseStepItemDto[];
}

export class AcceptTestCasesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptTestCaseItemDto)
  testCases: AcceptTestCaseItemDto[];

  @IsOptional()
  @IsBoolean()
  edited?: boolean;
}

export class AcceptTestDataItemDto {
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

export class AcceptTestDataDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptTestDataItemDto)
  testData: AcceptTestDataItemDto[];

  @IsOptional()
  @IsBoolean()
  edited?: boolean;
}

export class ApplySeverityDto {
  @IsOptional()
  @IsEnum(DefectSeverity)
  severity?: DefectSeverity;

  @IsOptional()
  @IsEnum(DefectPriority)
  priority?: DefectPriority;

  @IsOptional()
  @IsBoolean()
  edited?: boolean;
}
