import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ProductDocumentsService } from './product-documents.service';
import { CreateProductDocumentDto } from './dto/create-product-document.dto';
import { UpdateProductDocumentDto } from './dto/update-product-document.dto';
import { ReplaceProductDocumentDto } from './dto/replace-product-document.dto';
import { ListProductDocumentsQueryDto } from './dto/list-product-documents-query.dto';
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from './product-documents.constants';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

const UPLOAD_INTERCEPTOR = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES },
});

@Controller('product-documents')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductDocumentsController {
  constructor(private readonly documentsService: ProductDocumentsService) {}

  @Get()
  @RequirePermission('product_documents:read')
  findAll(@Query() query: ListProductDocumentsQueryDto) {
    return this.documentsService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('product_documents:read')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/versions')
  @RequirePermission('product_documents:read')
  findVersionHistory(@Param('id') id: string) {
    return this.documentsService.findVersionHistory(id);
  }

  @Get(':id/content')
  @RequirePermission('product_documents:read')
  async getContent(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const document = await this.documentsService.getContent(id, actor);
    res.set({
      'Content-Type': document.mimeType,
      'Content-Length': document.fileSize.toString(),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(document.fileName)}"`,
    });
    res.send(document.content);
  }

  @Get(':id/versions/:versionId/content')
  @RequirePermission('product_documents:read')
  async getVersionContent(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const version = await this.documentsService.getVersionContent(id, versionId, actor);
    res.set({
      'Content-Type': version.mimeType,
      'Content-Length': version.fileSize.toString(),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(version.fileName)}"`,
    });
    res.send(version.content);
  }

  @Post()
  @RequirePermission('product_documents:write')
  @UseInterceptors(UPLOAD_INTERCEPTOR)
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateProductDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.documentsService.create(dto, file, actor);
  }

  @Patch(':id')
  @RequirePermission('product_documents:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.documentsService.update(id, dto, actor);
  }

  @Post(':id/replace')
  @RequirePermission('product_documents:write')
  @UseInterceptors(UPLOAD_INTERCEPTOR)
  replace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ReplaceProductDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.documentsService.replace(id, file, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('product_documents:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.remove(id, actor);
  }
}
