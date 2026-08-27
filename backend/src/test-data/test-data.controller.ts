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
import { TestDataService } from './test-data.service';
import { CreateTestDataDto } from './dto/create-test-data.dto';
import { UpdateTestDataDto } from './dto/update-test-data.dto';
import { ListTestDataQueryDto } from './dto/list-test-data-query.dto';
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

@Controller('test-data')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestDataController {
  constructor(private readonly testDataService: TestDataService) {}

  @Get()
  @RequirePermission('test_data:read')
  findAll(@Query() query: ListTestDataQueryDto) {
    return this.testDataService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('test_data:read')
  findOne(@Param('id') id: string) {
    return this.testDataService.findOne(id);
  }

  @Post()
  @RequirePermission('test_data:write')
  create(@Body() dto: CreateTestDataDto) {
    return this.testDataService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('test_data:write')
  update(@Param('id') id: string, @Body() dto: UpdateTestDataDto) {
    return this.testDataService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_data:manage')
  remove(@Param('id') id: string) {
    return this.testDataService.remove(id);
  }

  @Post('import')
  @RequirePermission('test_data:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.testDataService.bulkImport(rows, actor);
  }
}
