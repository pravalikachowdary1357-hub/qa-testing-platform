import { Module } from '@nestjs/common';
import { DefectsController } from './defects.controller';
import { DefectsService } from './defects.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [DefectsController],
  providers: [DefectsService],
})
export class DefectsModule {}
