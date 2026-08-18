import { IsOptional, IsUUID } from 'class-validator';

export class ListReleasesQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;
}
