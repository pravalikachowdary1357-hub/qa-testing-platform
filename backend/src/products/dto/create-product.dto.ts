import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import {
  ProductStatus,
  ReleaseReadiness,
} from '../../../generated/prisma/enums.js';

export class CreateProductDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsString()
  @IsNotEmpty()
  environment: string;

  @IsString()
  @IsNotEmpty()
  release: string;

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

  @IsInt()
  @Min(0)
  @Max(100)
  testCoverage: number;

  @IsInt()
  @Min(0)
  @Max(100)
  passRate: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  openDefects?: number;

  @IsOptional()
  @IsEnum(ReleaseReadiness)
  releaseReadiness?: ReleaseReadiness;
}
