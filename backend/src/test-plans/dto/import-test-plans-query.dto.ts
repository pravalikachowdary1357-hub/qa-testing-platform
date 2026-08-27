import { IsUUID } from 'class-validator';

export class ImportTestPlansQueryDto {
  @IsUUID()
  productId: string;
}
