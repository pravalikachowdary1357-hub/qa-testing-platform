import { IsOptional, IsUUID } from 'class-validator';

export class ListPerformanceTestsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
