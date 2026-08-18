import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// `status` here only accepts the planning-phase values a human moves through
// freely (PLANNED -> IN_PROGRESS -> COMPLETED). APPROVED/REJECTED are
// deliberately excluded -- those require the dedicated sign-off action so an
// approval always carries who signed off and when, never a bare status flip.
export class UpdateUatCycleDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED'])
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
}
