import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}
