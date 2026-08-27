import { IsUUID } from 'class-validator';

export class ImportTestScenariosQueryDto {
  @IsUUID()
  productId: string;
}
