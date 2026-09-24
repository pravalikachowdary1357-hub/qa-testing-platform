import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { OrganizationStatus } from '../../../generated/prisma/enums.js';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'Organization key must be 2-10 uppercase letters/digits (e.g. QMICS).',
  })
  orgKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, {
    message: 'Organization ID must be 2-20 letters/digits/hyphens (e.g. ORG-001).',
  })
  orgReferenceId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear() + 1)
  establishedYear?: number;

  @IsOptional()
  @IsEmail()
  email?: string;
}
