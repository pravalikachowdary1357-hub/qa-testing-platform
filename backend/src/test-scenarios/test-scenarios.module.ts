import { Module } from '@nestjs/common';
import { TestScenariosController } from './test-scenarios.controller';
import { TestScenariosService } from './test-scenarios.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [TestScenariosController],
  providers: [TestScenariosService],
})
export class TestScenariosModule {}
