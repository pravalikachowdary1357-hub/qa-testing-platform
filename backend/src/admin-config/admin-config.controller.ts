import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { UpdateApprovalPolicyDto } from './dto/update-approval-policy.dto';
import { UpdateDashboardConfigDto } from './dto/update-dashboard-config.dto';
import { UpdateDataRetentionDto } from './dto/update-data-retention.dto';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminConfigController {
  constructor(private readonly service: AdminConfigService) {}

  @Get('workflows')
  @RequirePermission('workflows:read')
  listWorkflows() {
    return this.service.listWorkflows();
  }

  @Put('workflows/:key')
  @RequirePermission('workflows:manage')
  updateWorkflow(
    @Param('key') key: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateWorkflow(key, dto, actor);
  }

  @Get('approval-policies')
  @RequirePermission('workflows:read')
  listApprovalPolicies() {
    return this.service.listApprovalPolicies();
  }

  @Put('approval-policies/:key')
  @RequirePermission('workflows:manage')
  updateApprovalPolicy(
    @Param('key') key: string,
    @Body() dto: UpdateApprovalPolicyDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateApprovalPolicy(key, dto, actor);
  }

  // Every signed-in role renders the dashboard, so reading its layout only
  // requires authentication; changing it requires dashboards:manage.
  @Get('dashboard-config')
  getDashboardConfig(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getDashboardConfig(actor);
  }

  @Put('dashboard-config')
  @RequirePermission('dashboards:manage')
  updateDashboardConfig(
    @Body() dto: UpdateDashboardConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateDashboardConfig(dto, actor);
  }

  @Delete('dashboard-config/roles/:roleId')
  @RequirePermission('dashboards:manage')
  clearDashboardRoleOverride(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.clearDashboardRoleOverride(roleId, actor);
  }

  // Notification configuration is part of Application Settings, so it
  // reuses the app_settings permissions. Configuration only -- no delivery.
  @Get('notification-config')
  @RequirePermission('app_settings:read')
  getNotificationConfig() {
    return this.service.getNotificationConfig();
  }

  @Put('notification-config')
  @RequirePermission('app_settings:manage')
  updateNotificationConfig(
    @Body() dto: UpdateNotificationConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateNotificationConfig(dto, actor);
  }

  @Get('integrations')
  @RequirePermission('integrations:read')
  listIntegrations() {
    return this.service.listIntegrations();
  }

  // Data retention is a system setting, so it reuses the existing
  // app_settings permissions instead of introducing new keys.
  @Get('data-retention')
  @RequirePermission('app_settings:read')
  getDataRetention() {
    return this.service.getDataRetention();
  }

  @Put('data-retention')
  @RequirePermission('app_settings:manage')
  updateDataRetention(
    @Body() dto: UpdateDataRetentionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateDataRetention(dto, actor);
  }
}
