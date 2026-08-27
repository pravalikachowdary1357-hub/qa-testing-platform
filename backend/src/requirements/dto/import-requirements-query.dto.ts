import { IsUUID } from 'class-validator';

export class ImportRequirementsQueryDto {
  @IsUUID()
  productId: string;
}
