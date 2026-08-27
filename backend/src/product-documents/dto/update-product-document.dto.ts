import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  ProductDocumentStatus,
  ProductDocumentType,
} from '../../../generated/prisma/enums.js';

// Metadata-only edit -- does not touch the file itself (use the /replace
// endpoint for that).
export class UpdateProductDocumentDto {
  @IsOptional()
  @IsEnum(ProductDocumentType)
  documentType?: ProductDocumentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductDocumentStatus)
  status?: ProductDocumentStatus;
}
