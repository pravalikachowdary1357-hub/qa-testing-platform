import { Module } from '@nestjs/common';
import { ProductComponentsController } from './product-components.controller';
import { ProductComponentsService } from './product-components.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [ProductComponentsController],
  providers: [ProductComponentsService],
})
export class ProductComponentsModule {}
