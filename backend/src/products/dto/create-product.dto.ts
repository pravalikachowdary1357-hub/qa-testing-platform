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

export class CreateProductDto {
  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'Product key must be 2-10 uppercase letters/digits (e.g. CP).',
  })
  productKey?: string;

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
