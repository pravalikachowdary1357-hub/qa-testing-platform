import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignOffReleaseDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsNotEmpty()
  signOffBy: string;

  @IsOptional()
  @IsString()
  signOffNotes?: string;
}
