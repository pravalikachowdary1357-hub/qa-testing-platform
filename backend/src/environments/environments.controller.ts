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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { ListEnvironmentsQueryDto } from './dto/list-environments-query.dto';
import { ImportEnvironmentsQueryDto } from './dto/import-environments-query.dto';
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

@Controller('environments')
@UseGuards(AuthGuard, PermissionsGuard)
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  @RequirePermission('environments:read')
  findAll(@Query() query: ListEnvironmentsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.environmentsService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('environments:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.environmentsService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('environments:write')
  create(@Body() dto: CreateEnvironmentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.environmentsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('environments:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.environmentsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('environments:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.environmentsService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('environments:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportEnvironmentsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.environmentsService.bulkImport(rows, query.productId, actor);
  }
}
