import { IsOptional, IsUUID } from 'class-validator';

export class ListApiTestRequestsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
