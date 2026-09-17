import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  ProductStatus,
  ReleaseReadiness,
} from '../../../generated/prisma/enums.js';

export class UpdateProductDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'Product key must be 2-10 uppercase letters/digits (e.g. CP).',
  })
  productKey?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  environment?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  release?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  applicationUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  repositoryUrl?: string;

  @IsOptional()
  @IsUUID()
  productOwnerId?: string;

  @IsOptional()
  @IsString()
  currentVersion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  testCoverage?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  openDefects?: number;

  @IsOptional()
  @IsEnum(ReleaseReadiness)
  releaseReadiness?: ReleaseReadiness;
}
