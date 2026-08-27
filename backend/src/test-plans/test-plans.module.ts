import { Module } from '@nestjs/common';
import { TestPlansController } from './test-plans.controller';
import { TestPlansService } from './test-plans.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [TestPlansController],
  providers: [TestPlansService],
})
export class TestPlansModule {}
