import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ReleaseQualityModule } from '../release-quality/release-quality.module';

@Module({
  imports: [AuditLogModule, ReleaseQualityModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
