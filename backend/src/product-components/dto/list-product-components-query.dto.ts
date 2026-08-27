import { IsUUID } from 'class-validator';

// productId is required, not optional, to keep product-level isolation the
// default rather than something callers must remember to apply (matches
// list-product-documents-query.dto.ts's convention).
export class ListProductComponentsQueryDto {
  @IsUUID()
  productId: string;
}
