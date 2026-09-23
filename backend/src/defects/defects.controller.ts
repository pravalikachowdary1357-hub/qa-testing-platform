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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DefectsService } from './defects.service';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';
import { ListDefectsQueryDto } from './dto/list-defects-query.dto';
import { ImportDefectsQueryDto } from './dto/import-defects-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { parseCsvBuffer } from '../common/csv/csv.util';
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../common/import/import.constants';

const IMPORT_INTERCEPTOR = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES },
});

@Controller('defects')
@UseGuards(AuthGuard, PermissionsGuard)
export class DefectsController {
  constructor(private readonly defectsService: DefectsService) {}

  @Get()
  @RequirePermission('defects:read')
  findAll(
    @Query() query: ListDefectsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.defectsService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('defects:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.defectsService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('defects:write')
  create(@Body() dto: CreateDefectDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.defectsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('defects:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDefectDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.defectsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('defects:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.defectsService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('defects:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportDefectsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.defectsService.bulkImport(rows, query.productId, actor);
  }
}
