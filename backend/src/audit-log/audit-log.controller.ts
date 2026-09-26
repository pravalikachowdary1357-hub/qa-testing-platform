import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { LogExportEventDto } from './dto/log-export-event.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('audit-log')
@UseGuards(AuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('audit_log:read')
  findAll(@Query() query: ListAuditLogQueryDto) {
    const { entityType, ...filters } = query;
    return this.auditLogService.findAll(entityType, undefined, filters);
  }

  @Get('facets')
  @RequirePermission('audit_log:read')
  facets() {
    return this.auditLogService.facets();
  }

  // No @RequirePermission -- any authenticated user may log their own
  // client-side export action (they could only have exported data their
  // role already permits them to view).
  @Post('export-event')
  logExportEvent(
    @Body() dto: LogExportEventDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.auditLogService.record({
      actorUserId: actor.id,
      action: 'export',
      entityType: dto.entityType,
      summary: dto.summary,
    });
  }
}
