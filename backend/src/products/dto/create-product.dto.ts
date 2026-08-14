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
