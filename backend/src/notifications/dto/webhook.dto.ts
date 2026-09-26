import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NOTIFICATION_EVENTS } from '../../admin-config/admin-config.constants';

export class CreateWebhookDto {
  @IsIn(['TEAMS', 'SLACK'])
  provider: 'TEAMS' | 'SLACK';

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  // Secret: stored encrypted, never returned.
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url: string;

  @IsArray()
  @ArrayMaxSize(NOTIFICATION_EVENTS.length)
  @IsIn(NOTIFICATION_EVENTS, { each: true })
  events: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  // Only sent when replacing the URL.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(NOTIFICATION_EVENTS.length)
  @IsIn(NOTIFICATION_EVENTS, { each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
