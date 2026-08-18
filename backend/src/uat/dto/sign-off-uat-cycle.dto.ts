import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignOffUatCycleDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  signOffBy: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
