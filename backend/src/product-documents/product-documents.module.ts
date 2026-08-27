import { Module } from '@nestjs/common';
import { ProductDocumentsController } from './product-documents.controller';
import { ProductDocumentsService } from './product-documents.service';

@Module({
  controllers: [ProductDocumentsController],
  providers: [ProductDocumentsService],
})
export class ProductDocumentsModule {}
