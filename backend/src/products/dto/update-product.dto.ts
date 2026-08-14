import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsString()
  @IsNotEmpty()
  name?: string;

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
