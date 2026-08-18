import { IsNotEmpty, IsString } from 'class-validator';

export class UatTestCaseStepInputDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;
}
