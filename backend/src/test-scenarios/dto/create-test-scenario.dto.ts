import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  TestScenarioPriority,
  TestScenarioStatus,
  TestScenarioType,
} from '../../../generated/prisma/enums.js';

export class CreateTestScenarioDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  requirementId?: string;

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

  @IsOptional()
  @IsEnum(TestScenarioStatus)
  status?: TestScenarioStatus;
}
