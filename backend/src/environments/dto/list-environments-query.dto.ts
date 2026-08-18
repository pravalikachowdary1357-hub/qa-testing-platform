import { IsOptional, IsUUID } from 'class-validator';

export class ListEnvironmentsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
