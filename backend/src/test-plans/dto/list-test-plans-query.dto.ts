import { IsOptional, IsUUID } from 'class-validator';

export class ListTestPlansQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
