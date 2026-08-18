import { IsOptional, IsUUID } from 'class-validator';

export class ListDefectsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
