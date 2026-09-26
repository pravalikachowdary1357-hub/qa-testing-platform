import { AuditTrail } from '../audit-log/audit-trail.interceptor';
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

// Creating/updating a TestExecution record IS "executing a test" in this
// app's model -- there's no separate run endpoint -- so those two actions
// are gated by test_executions:execute rather than a :write permission.
@AuditTrail('TestExecution')
@Controller('test-executions')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestExecutionsController {
  constructor(private readonly testExecutionsService: TestExecutionsService) {}

  @Get()
  @RequirePermission('test_executions:read')
  findAll(@Query() query: ListTestExecutionsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.testExecutionsService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('test_executions:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.testExecutionsService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('test_executions:execute')
  create(@Body() dto: CreateTestExecutionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.testExecutionsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('test_executions:execute')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestExecutionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.testExecutionsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_executions:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.testExecutionsService.remove(id, actor);
  }
}
