import { IsOptional, IsUUID } from 'class-validator';

export class ListTestCasesQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
