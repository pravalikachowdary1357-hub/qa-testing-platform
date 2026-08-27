import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUatCycleDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
