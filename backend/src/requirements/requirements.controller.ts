import {
  BadRequestException,
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
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { ReviewRequirementDto } from './dto/review-requirement.dto';
import { ListRequirementsQueryDto } from './dto/list-requirements-query.dto';
import { ImportRequirementsQueryDto } from './dto/import-requirements-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { parseCsvBuffer } from '../common/csv/csv.util';
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../common/import/import.constants';
import { MAX_REQUIREMENT_ATTACHMENT_SIZE_BYTES } from './requirements.constants';

const IMPORT_INTERCEPTOR = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES },
});

const ATTACHMENT_UPLOAD_INTERCEPTOR = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_REQUIREMENT_ATTACHMENT_SIZE_BYTES },
});

@Controller('requirements')
@UseGuards(AuthGuard, PermissionsGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  @RequirePermission('requirements:read')
  findAll(
    @Query() query: ListRequirementsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.requirementsService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('requirements:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.requirementsService.findOne(id, actor.organizationId);
  }

  @Get(':id/activity')
  @RequirePermission('requirements:read')
  findActivity(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.requirementsService.findActivity(id, actor);
  }

  @Get(':id/versions')
  @RequirePermission('requirements:read')
  findVersions(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.requirementsService.findVersions(id, actor);
  }

  @Get(':id/attachments')
  @RequirePermission('requirements:read')
  listAttachments(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.requirementsService.listAttachments(id, actor);
  }

  @Get(':id/attachments/:attachmentId/content')
  @RequirePermission('requirements:read')
  async getAttachmentContent(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const attachment = await this.requirementsService.getAttachmentContent(
      id,
      attachmentId,
      actor,
    );
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Length': attachment.fileSize.toString(),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(attachment.fileName)}"`,
    });
    res.send(Buffer.from(attachment.content)); // Prisma returns Uint8Array; send raw bytes, not JSON
  }

  @Post()
  @RequirePermission('requirements:write')
  create(
    @Body() dto: CreateRequirementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.requirementsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('requirements:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.requirementsService.update(id, dto, actor);
  }

  @Post(':id/review')
  @RequirePermission('requirements:approve')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewRequirementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.requirementsService.review(id, dto, actor);
  }

  @Post(':id/attachments')
  @RequirePermission('requirements:write')
  @UseInterceptors(ATTACHMENT_UPLOAD_INTERCEPTOR)
  addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.requirementsService.addAttachment(id, file, actor);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('requirements:manage')
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.requirementsService.removeAttachment(id, attachmentId, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('requirements:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.requirementsService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('requirements:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportRequirementsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.requirementsService.bulkImport(rows, query.productId, actor);
  }
}
