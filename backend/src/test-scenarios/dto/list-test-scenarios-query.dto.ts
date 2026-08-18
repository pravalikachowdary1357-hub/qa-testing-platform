import { IsOptional, IsUUID } from 'class-validator';

export class ListTestScenariosQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
