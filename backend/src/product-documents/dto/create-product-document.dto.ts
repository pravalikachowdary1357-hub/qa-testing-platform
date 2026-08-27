import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  ProductDocumentStatus,
  ProductDocumentType,
} from '../../../generated/prisma/enums.js';

// Sent as multipart/form-data alongside the file itself, so every field
// arrives as a string -- multer parses the "file" part separately.
export class CreateProductDocumentDto {
  @IsUUID()
  productId: string;

  @IsEnum(ProductDocumentType)
  documentType: ProductDocumentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  relatedVersion?: string;

  @IsOptional()
  @IsEnum(ProductDocumentStatus)
  status?: ProductDocumentStatus;
}
