import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { HttpMethod } from '../../../generated/prisma/enums.js';

export class UpdatePerformanceTestDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetUrl?: string;

  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  virtualUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  rampUpSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  iterations?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  thresholdResponseTimeMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  thresholdErrorRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdThroughputRps?: number;
}
