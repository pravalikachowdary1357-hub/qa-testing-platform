import { Module } from '@nestjs/common';
import { ProductDocumentsController } from './product-documents.controller';
import { ProductDocumentsService } from './product-documents.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [ProductDocumentsController],
  providers: [ProductDocumentsService],
})
export class ProductDocumentsModule {}
