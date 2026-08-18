import { IsOptional, IsUUID } from 'class-validator';

export class TraceabilityQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
