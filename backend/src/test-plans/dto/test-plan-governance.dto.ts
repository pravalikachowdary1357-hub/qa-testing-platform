import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Testing levels and types the Test Manager identifies for a plan
// (Roles & Responsibilities section 3: "Identify testing levels and types").
export const TEST_LEVELS = [
  'UNIT',
  'INTEGRATION',
  'SYSTEM',
  'SYSTEM_INTEGRATION',
  'ACCEPTANCE',
] as const;

export const TEST_TYPES = [
  'FUNCTIONAL',
  'REGRESSION',
  'SMOKE',
  'SANITY',
  'API',
  'PERFORMANCE',
  'SECURITY',
  'USABILITY',
  'COMPATIBILITY',
  'ACCESSIBILITY',
  'DATA_MIGRATION',
  'UAT',
] as const;

export class TestPlanMilestoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

// Fields shared by create and update; every one is optional.
export class TestPlanGovernanceDto {
  @IsOptional()
  @IsBoolean()
  isMaster?: boolean;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsOptional()
  @IsArray()
  @IsIn(TEST_LEVELS, { each: true })
  testLevels?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(TEST_TYPES, { each: true })
  testTypes?: string[];

  @IsOptional()
  @IsString()
  approach?: string;

  @IsOptional()
  @IsString()
  entryCriteria?: string;

  @IsOptional()
  @IsString()
  exitCriteria?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedEffortHours?: number;

  @IsOptional()
  @IsString()
  resources?: string;

  @IsOptional()
  @IsString()
  risks?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TestPlanMilestoneDto)
  milestones?: TestPlanMilestoneDto[];
}
