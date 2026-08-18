import { IsOptional, IsString } from 'class-validator';

// Every query key this endpoint accepts must be declared here -- the global
// ValidationPipe validates a bare @Query() DTO against the entire raw query
// string, so an undeclared key is rejected with a 400.
export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
