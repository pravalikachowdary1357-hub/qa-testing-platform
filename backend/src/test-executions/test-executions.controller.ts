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
import { TestExecutionsService } from './test-executions.service';
import { CreateTestExecutionDto } from './dto/create-test-execution.dto';
import { UpdateTestExecutionDto } from './dto/update-test-execution.dto';
import { ListTestExecutionsQueryDto } from './dto/list-test-executions-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

// Creating/updating a TestExecution record IS "executing a test" in this
// app's model -- there's no separate run endpoint -- so those two actions
// are gated by test_executions:execute rather than a :write permission.
@Controller('test-executions')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestExecutionsController {
  constructor(private readonly testExecutionsService: TestExecutionsService) {}

  @Get()
  @RequirePermission('test_executions:read')
  findAll(@Query() query: ListTestExecutionsQueryDto) {
    return this.testExecutionsService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('test_executions:read')
  findOne(@Param('id') id: string) {
    return this.testExecutionsService.findOne(id);
  }

  @Post()
  @RequirePermission('test_executions:execute')
  create(@Body() dto: CreateTestExecutionDto) {
    return this.testExecutionsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('test_executions:execute')
  update(@Param('id') id: string, @Body() dto: UpdateTestExecutionDto) {
    return this.testExecutionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_executions:manage')
  remove(@Param('id') id: string) {
    return this.testExecutionsService.remove(id);
  }
}
