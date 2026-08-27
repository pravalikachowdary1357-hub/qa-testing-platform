import { Module } from '@nestjs/common';
import { TestDataController } from './test-data.controller';
import { TestDataService } from './test-data.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [TestDataController],
  providers: [TestDataService],
})
export class TestDataModule {}
