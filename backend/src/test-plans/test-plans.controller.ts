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
import { TestPlansService } from './test-plans.service';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { ListTestPlansQueryDto } from './dto/list-test-plans-query.dto';
import { ImportTestPlansQueryDto } from './dto/import-test-plans-query.dto';
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

@Controller('test-plans')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestPlansController {
  constructor(private readonly testPlansService: TestPlansService) {}

  @Get()
  @RequirePermission('test_plans:read')
  findAll(
    @Query() query: ListTestPlansQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.testPlansService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('test_plans:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.testPlansService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('test_plans:write')
  create(@Body() dto: CreateTestPlanDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.testPlansService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('test_plans:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.testPlansService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_plans:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.testPlansService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('test_plans:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportTestPlansQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.testPlansService.bulkImport(rows, query.productId, actor);
  }
}
