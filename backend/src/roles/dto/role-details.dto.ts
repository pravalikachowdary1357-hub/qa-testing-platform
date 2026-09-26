import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const ROLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 &/().-]*$/;
const ROLE_NAME_MESSAGE =
  'Role name must start with a letter and use only letters, numbers, spaces and & / ( ) . -';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(ROLE_NAME_PATTERN, { message: ROLE_NAME_MESSAGE })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class UpdateRoleDetailsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(ROLE_NAME_PATTERN, { message: ROLE_NAME_MESSAGE })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
