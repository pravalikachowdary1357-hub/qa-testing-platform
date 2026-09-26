import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ReleaseQualityModule } from '../release-quality/release-quality.module';
import {
  IntegrationsController,
  NotificationsController,
  NotificationsCronController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule, AuditLogModule, ReleaseQualityModule],
  // Cron controller first so "notifications/cron" is matched before any
  // parameterised notifications route.
  controllers: [
    NotificationsCronController,
    NotificationsController,
    IntegrationsController,
  ],
  providers: [NotificationsService],
})
export class NotificationsModule {}
