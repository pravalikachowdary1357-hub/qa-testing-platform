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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
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

@Controller('organizations')
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequirePermission('organizations:read')
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.organizationsService.findAll(actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('organizations:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.organizationsService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('organizations:write')
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.organizationsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('organizations:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.organizationsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('organizations:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.organizationsService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('organizations:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.organizationsService.bulkImport(rows, actor);
  }
}
