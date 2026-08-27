import { IsUUID } from 'class-validator';

// Every query key this endpoint accepts must be declared here -- the global
// ValidationPipe validates a bare @Query() DTO against the entire raw query
// string, so an undeclared key is rejected with a 400. productId is
// required (not optional, unlike some sibling list endpoints) to keep
// product-level isolation the default rather than something callers must
// remember to apply.
export class ListProductDocumentsQueryDto {
  @IsUUID()
  productId: string;
}
