import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import {
  MAX_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
  MIN_OTHER_RETENTION_DAYS,
} from '../admin-config.constants';

// null = keep forever.
export class UpdateDataRetentionDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(MIN_AUDIT_RETENTION_DAYS)
  @Max(MAX_RETENTION_DAYS)
  auditLogRetentionDays: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(MIN_OTHER_RETENTION_DAYS)
  @Max(MAX_RETENTION_DAYS)
  aiHistoryRetentionDays: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(MIN_OTHER_RETENTION_DAYS)
  @Max(MAX_RETENTION_DAYS)
  expiredSessionRetentionDays: number | null;
}
