import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { OrganizationDocumentsService } from './organization-documents.service';
import { CreateOrganizationDocumentDto } from './dto/create-organization-document.dto';
import { ListOrganizationDocumentsQueryDto } from './dto/list-organization-documents-query.dto';
import { MAX_ORGANIZATION_DOCUMENT_FILE_SIZE_BYTES } from './organization-documents.constants';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

const UPLOAD_INTERCEPTOR = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_ORGANIZATION_DOCUMENT_FILE_SIZE_BYTES },
});

@Controller('organization-documents')
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationDocumentsController {
  constructor(private readonly documentsService: OrganizationDocumentsService) {}

  @Get()
  @RequirePermission('organizations:read')
  findAll(@Query() query: ListOrganizationDocumentsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.findAll(query.organizationId, actor.organizationId);
  }

  @Get(':id/content')
  @RequirePermission('organizations:read')
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

  @Post()
  @RequirePermission('organizations:write')
  @UseInterceptors(UPLOAD_INTERCEPTOR)
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateOrganizationDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.documentsService.create(dto.organizationId, file, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('organizations:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.documentsService.remove(id, actor);
  }
}
