import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

// Every signed-in user: their own notifications only.
@Controller('notifications')
@UseGuards(AuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.list(actor, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.unreadCount(actor);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.markRead(id, actor);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.markAllRead(actor);
  }

  // Administrator: run reminders / escalations / overdue alerts now.
  @Post('run-scheduled')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('app_settings:manage')
  runScheduled(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.runScheduled(actor);
  }
}

// Called once a day by Vercel Cron (see vercel.json). Vercel sends
// "Authorization: Bearer <CRON_SECRET>"; without CRON_SECRET configured the
// endpoint refuses to run, so it can never be triggered anonymously.
@Controller('notifications/cron')
export class NotificationsCronController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async run(@Headers('authorization') authorization: string | undefined) {
    const secret = process.env.CRON_SECRET;
    if (!secret)
      throw new ServiceUnavailableException('CRON_SECRET is not configured.');
    const expected = Buffer.from(`Bearer ${secret}`);
    const given = Buffer.from(authorization ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException();
    }
    return this.service.runScheduled();
  }
}

// Settings > Integrations: Teams / Slack webhooks and email.
@Controller('integrations')
@UseGuards(AuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('webhooks')
  @RequirePermission('integrations:read')
  listWebhooks(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.listWebhooks(actor);
  }

  @Post('webhooks')
  @RequirePermission('integrations:manage')
  createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createWebhook(dto, actor);
  }

  @Patch('webhooks/:id')
  @RequirePermission('integrations:manage')
  updateWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateWebhook(id, dto, actor);
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('integrations:manage')
  deleteWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.deleteWebhook(id, actor);
  }

  @Post('webhooks/:id/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integrations:manage')
  testWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.testWebhook(id, actor);
  }

  @Get('email')
  @RequirePermission('integrations:read')
  emailStatus() {
    return this.service.emailStatus();
  }

  @Post('email/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integrations:manage')
  testEmail(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.testEmail(actor);
  }
}
