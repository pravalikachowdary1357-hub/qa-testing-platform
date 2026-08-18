import { IsOptional, IsUUID } from 'class-validator';

export class ListUatCyclesQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
