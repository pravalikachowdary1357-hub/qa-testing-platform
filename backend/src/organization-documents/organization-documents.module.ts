import { Module } from '@nestjs/common';
import { OrganizationDocumentsController } from './organization-documents.controller';
import { OrganizationDocumentsService } from './organization-documents.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [OrganizationDocumentsController],
  providers: [OrganizationDocumentsService],
})
export class OrganizationDocumentsModule {}
