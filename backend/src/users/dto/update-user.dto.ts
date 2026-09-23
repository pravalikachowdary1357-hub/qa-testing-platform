import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  // null explicitly clears an existing assignment (Prisma sets the column to
  // NULL); undefined/omitted leaves it untouched. @IsOptional() skips @IsUUID
  // for both null and undefined, so an explicit null still passes validation.
  @IsOptional()
  @IsUUID()
  organizationId?: string | null;
}
