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
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { ListTestCasesQueryDto } from './dto/list-test-cases-query.dto';
import { ImportTestCasesQueryDto } from './dto/import-test-cases-query.dto';
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

@Controller('test-cases')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Get()
  @RequirePermission('test_cases:read')
  findAll(@Query() query: ListTestCasesQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.testCasesService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('test_cases:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.testCasesService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('test_cases:write')
  create(@Body() dto: CreateTestCaseDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.testCasesService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('test_cases:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.testCasesService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_cases:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.testCasesService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('test_cases:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportTestCasesQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.testCasesService.bulkImport(rows, query.productId, actor);
  }
}
