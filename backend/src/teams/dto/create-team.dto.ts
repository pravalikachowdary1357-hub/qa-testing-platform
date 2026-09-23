import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
