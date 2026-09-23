import { Module } from '@nestjs/common';
import { BusinessUnitsController } from './business-units.controller';
import { BusinessUnitsService } from './business-units.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [BusinessUnitsController],
  providers: [BusinessUnitsService],
})
export class BusinessUnitsModule {}
