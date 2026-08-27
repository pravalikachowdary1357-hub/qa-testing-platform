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
import { TestScenariosService } from './test-scenarios.service';
import { CreateTestScenarioDto } from './dto/create-test-scenario.dto';
import { UpdateTestScenarioDto } from './dto/update-test-scenario.dto';
import { ListTestScenariosQueryDto } from './dto/list-test-scenarios-query.dto';
import { ImportTestScenariosQueryDto } from './dto/import-test-scenarios-query.dto';
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

@Controller('test-scenarios')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestScenariosController {
  constructor(private readonly testScenariosService: TestScenariosService) {}

  @Get()
  @RequirePermission('test_scenarios:read')
  findAll(@Query() query: ListTestScenariosQueryDto) {
    return this.testScenariosService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('test_scenarios:read')
  findOne(@Param('id') id: string) {
    return this.testScenariosService.findOne(id);
  }

  @Post()
  @RequirePermission('test_scenarios:write')
  create(@Body() dto: CreateTestScenarioDto) {
    return this.testScenariosService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('test_scenarios:write')
  update(@Param('id') id: string, @Body() dto: UpdateTestScenarioDto) {
    return this.testScenariosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_scenarios:manage')
  remove(@Param('id') id: string) {
    return this.testScenariosService.remove(id);
  }

  @Post('import')
  @RequirePermission('test_scenarios:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() query: ImportTestScenariosQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.testScenariosService.bulkImport(rows, query.productId, actor);
  }
}
