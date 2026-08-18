import { IsIn, IsOptional, IsString } from 'class-validator';

// Only PASSED/FAILED are valid completion outcomes -- NOT_STARTED and
// RUNNING are lifecycle states the server manages itself, never something a
// client "completes" a test into.
export class CompleteSecurityTestDto {
  @IsIn(['PASSED', 'FAILED'])
  status: 'PASSED' | 'FAILED';

  @IsOptional()
  @IsString()
  notes?: string;
}
