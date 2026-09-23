import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
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
}
