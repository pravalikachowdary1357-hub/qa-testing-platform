import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// `status` here only accepts the pre-signoff values a human moves through
// freely (PLANNED -> IN_TESTING -> COMPLETED). APPROVED/REJECTED are
// deliberately excluded -- those require the dedicated sign-off action so an
// approval always carries who signed off and when, never a bare status flip.
export class UpdateReleaseDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  version?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'IN_TESTING', 'COMPLETED'])
  status?: 'PLANNED' | 'IN_TESTING' | 'COMPLETED';

  @IsOptional()
  @IsDateString()
  releaseDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}
