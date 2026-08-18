import {
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
  UseGuards,
} from '@nestjs/common';
import { TestDataService } from './test-data.service';
import { CreateTestDataDto } from './dto/create-test-data.dto';
import { UpdateTestDataDto } from './dto/update-test-data.dto';
import { ListTestDataQueryDto } from './dto/list-test-data-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

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
}
