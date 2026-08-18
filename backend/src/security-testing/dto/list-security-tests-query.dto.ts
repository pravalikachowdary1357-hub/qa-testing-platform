import { IsOptional, IsUUID } from 'class-validator';

export class ListSecurityTestsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
