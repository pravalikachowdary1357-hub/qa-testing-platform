import { IsUUID } from 'class-validator';

export class ListBuildsQueryDto {
  @IsUUID()
  productId: string;
}
