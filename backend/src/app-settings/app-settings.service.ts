import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { AuthenticatedUser } from '../auth/current-user.decorator';

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
}
