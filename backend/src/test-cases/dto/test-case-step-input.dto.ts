import { IsNotEmpty, IsString } from 'class-validator';

export class TestCaseStepInputDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;
}
