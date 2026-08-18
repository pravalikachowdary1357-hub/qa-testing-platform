import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiAuthType, HttpMethod } from '../../../generated/prisma/enums.js';

export class CreateApiTestRequestDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsObject()
  queryParams?: Record<string, string>;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(ApiAuthType)
  authType?: ApiAuthType;

  @IsOptional()
  @IsObject()
  authConfig?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatus?: number;
}
