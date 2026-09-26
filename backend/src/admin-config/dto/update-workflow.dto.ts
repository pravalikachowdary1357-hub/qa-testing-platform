import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class WorkflowTransitionDto {
  @IsString()
  from: string;

  @IsString()
  to: string;
}

export class UpdateWorkflowDto {
  @IsBoolean()
  enforced: boolean;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => WorkflowTransitionDto)
  transitions: WorkflowTransitionDto[];
}
