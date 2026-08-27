import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { validateRow } from '../common/import/validate-row.util';
import type { ImportResult, ImportRowError } from '../common/import/import-result.interface';

// CSV cells arrive as strings; the update DTO's boolean fields need real
// booleans for class-validator's @IsBoolean to accept them. An unrecognized
// value is passed through as-is so validateRow's own error message (rather
// than a silently-dropped field) is what the caller sees.
function parseBooleanCell(value: string | undefined): unknown {
  if (value === undefined || value.trim() === '') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return value;
}

@Injectable()
export class AppSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get() {
    const existing = await this.prisma.appSetting.findFirst({
      orderBy: { updatedAt: 'asc' },
    });
    if (existing) return existing;
    return this.prisma.appSetting.create({ data: {} });
  }

  async update(dto: UpdateAppSettingsDto, actor: AuthenticatedUser) {
    const current = await this.get();
    const updated = await this.prisma.appSetting.update({
      where: { id: current.id },
      data: { ...dto, updatedByUserId: actor.id },
    });

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'app_settings.updated',
      entityType: 'AppSetting',
      entityId: updated.id,
      summary: 'Updated application settings.',
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  // Application Settings is a singleton row, so import is deliberately a
  // single-data-row CSV (matching the one-row export the frontend produces)
  // rather than the many-row bulkImport pattern used by list-backed modules.
  // Validation reuses UpdateAppSettingsDto -- the same DTO the PATCH
  // endpoint validates against -- so import can never accept something the
  // normal update endpoint would reject.
  async importSettings(
    rows: Record<string, string>[],
    actor: AuthenticatedUser,
  ): Promise<ImportResult> {
    if (rows.length === 0) {
      const errors: ImportRowError[] = [
        { row: 1, message: 'CSV file has no data rows.' },
      ];
      return { totalRows: 0, successCount: 0, errors };
    }

    if (rows.length > 1) {
      const errors: ImportRowError[] = [
        {
          row: 1,
          message: 'Application settings import expects exactly one data row.',
        },
      ];
      return { totalRows: rows.length, successCount: 0, errors };
    }

    const raw = rows[0];
    const candidate = {
      defaultEnvironmentType: raw.defaultEnvironmentType?.trim().toUpperCase() || undefined,
      defaultTestCasePriority: raw.defaultTestCasePriority?.trim().toUpperCase() || undefined,
      defaultDefectSeverity: raw.defaultDefectSeverity?.trim().toUpperCase() || undefined,
      notifyOnDefectCreated: parseBooleanCell(raw.notifyOnDefectCreated),
      notifyOnReleaseReadinessChange: parseBooleanCell(raw.notifyOnReleaseReadinessChange),
      notifyOnTestExecutionFailure: parseBooleanCell(raw.notifyOnTestExecutionFailure),
    };

    const result = await validateRow(UpdateAppSettingsDto, candidate);
    if ('error' in result) {
      const errors: ImportRowError[] = [{ row: 2, message: result.error }];
      return { totalRows: 1, successCount: 0, errors };
    }

    const current = await this.get();
    const updated = await this.prisma.appSetting.update({
      where: { id: current.id },
      data: { ...result.dto, updatedByUserId: actor.id },
    });

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'import',
      entityType: 'AppSetting',
      entityId: updated.id,
      summary: 'Imported application settings from CSV.',
      metadata: result.dto as Record<string, unknown>,
    });

    return { totalRows: 1, successCount: 1, errors: [] };
  }
}
