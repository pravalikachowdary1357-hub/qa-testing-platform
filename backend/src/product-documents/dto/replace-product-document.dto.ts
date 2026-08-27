import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductDocumentStatus } from '../../../generated/prisma/enums.js';

// Accompanies the new file on a /replace upload; anything left out keeps
// the document's existing value.
export class ReplaceProductDocumentDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductDocumentStatus)
  status?: ProductDocumentStatus;
}
