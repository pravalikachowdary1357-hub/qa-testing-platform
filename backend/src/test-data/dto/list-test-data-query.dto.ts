import { IsOptional, IsUUID } from 'class-validator';

export class ListTestDataQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
