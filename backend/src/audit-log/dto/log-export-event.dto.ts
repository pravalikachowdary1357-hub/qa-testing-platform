import { IsNotEmpty, IsString } from 'class-validator';

export class LogExportEventDto {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  summary: string;
}
