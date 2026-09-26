import { Module } from '@nestjs/common';
import { AdminConfigController } from './admin-config.controller';
import { AdminConfigService } from './admin-config.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AiProviderService } from '../ai/ai-provider.service';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [AdminConfigController],
  providers: [AdminConfigService, AiProviderService],
})
export class AdminConfigModule {}
