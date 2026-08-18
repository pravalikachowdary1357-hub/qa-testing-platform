import { IsOptional, IsUUID } from 'class-validator';

export class ListAutomationQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
