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
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { ListRequirementsQueryDto } from './dto/list-requirements-query.dto';
import { ImportRequirementsQueryDto } from './dto/import-requirements-query.dto';
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

@Controller('requirements')
@UseGuards(AuthGuard, PermissionsGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  @RequirePermission('requirements:read')
  findAll(@Query() query: ListRequirementsQueryDto) {
    return this.requirementsService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('requirements:read')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }

  @Post()
  @RequirePermission('requirements:write')
  create(@Body() dto: CreateRequirementDto) {
    return this.requirementsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('requirements:write')
  update(@Param('id') id: string, @Body() dto: UpdateRequirementDto) {
    return this.requirementsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('requirements:manage')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
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
