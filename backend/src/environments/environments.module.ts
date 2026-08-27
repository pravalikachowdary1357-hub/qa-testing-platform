import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
})
export class EnvironmentsModule {}
