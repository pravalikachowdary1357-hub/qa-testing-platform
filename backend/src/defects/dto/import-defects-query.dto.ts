import { IsUUID } from 'class-validator';

export class ImportDefectsQueryDto {
  @IsUUID()
  productId: string;
}
