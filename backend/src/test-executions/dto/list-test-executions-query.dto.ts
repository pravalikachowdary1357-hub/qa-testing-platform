import { IsOptional, IsUUID } from 'class-validator';

export class ListTestExecutionsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
