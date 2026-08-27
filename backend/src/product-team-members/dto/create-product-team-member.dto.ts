import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductTeamMemberDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  responsibility?: string;
}
