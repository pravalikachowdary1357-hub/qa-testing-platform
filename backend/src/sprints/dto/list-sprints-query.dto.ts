import { IsUUID } from 'class-validator';

// productId is required (not releaseId) since the Product Workspace lists
// every sprint across all of a product's releases in one call -- matches
// list-product-components-query.dto.ts's "always scoped" convention.
export class ListSprintsQueryDto {
  @IsUUID()
  productId: string;
}
