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
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { ListTestCasesQueryDto } from './dto/list-test-cases-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('test-cases')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Get()
  @RequirePermission('test_cases:read')
  findAll(@Query() query: ListTestCasesQueryDto) {
    return this.testCasesService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('test_cases:read')
  findOne(@Param('id') id: string) {
    return this.testCasesService.findOne(id);
  }

  @Post()
  @RequirePermission('test_cases:write')
  create(@Body() dto: CreateTestCaseDto) {
    return this.testCasesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('test_cases:write')
  update(@Param('id') id: string, @Body() dto: UpdateTestCaseDto) {
    return this.testCasesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_cases:manage')
  remove(@Param('id') id: string) {
    return this.testCasesService.remove(id);
  }
}
