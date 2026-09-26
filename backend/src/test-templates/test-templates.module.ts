import { Module } from '@nestjs/common';
import { TestTemplatesController } from './test-templates.controller';
import { TestTemplatesService } from './test-templates.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [TestTemplatesController],
  providers: [TestTemplatesService],
})
export class TestTemplatesModule {}
