import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

// Every query key a handler accepts must be declared here -- the global
// ValidationPipe validates a bare @Query() DTO against the *entire* raw
// query string, so an undeclared key is rejected with a 400 even if some
// other parameter reads it. (See the reports module's DTO for the same
// pattern and the reason it's needed.)
export class ListSuggestionsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateSuggestionStatusDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';
}
