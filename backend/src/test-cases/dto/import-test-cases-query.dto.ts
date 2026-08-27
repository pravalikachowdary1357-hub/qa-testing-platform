import { IsUUID } from 'class-validator';

export class ImportTestCasesQueryDto {
  @IsUUID()
  productId: string;
}
