import { IsUUID } from 'class-validator';

export class ImportEnvironmentsQueryDto {
  @IsUUID()
  productId: string;
}
