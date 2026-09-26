import {
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateNotificationConfigDto {
  // { EVENT: ['EMAIL' | 'IN_APP' | 'TEAMS_SLACK', ...] } -- shape and values
  // are validated in AdminConfigService.
  @IsObject()
  routing: Record<string, string[]>;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(90)
  escalationAfterDays: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(30)
  reminderDaysBeforeDue: number | null;
}
