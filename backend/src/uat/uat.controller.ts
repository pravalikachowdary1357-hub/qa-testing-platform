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
import { UatService } from './uat.service';
import { CreateUatCycleDto } from './dto/create-uat-cycle.dto';
import { UpdateUatCycleDto } from './dto/update-uat-cycle.dto';
import { SignOffUatCycleDto } from './dto/sign-off-uat-cycle.dto';
import { CreateUatTestCaseDto } from './dto/create-uat-test-case.dto';
import { UpdateUatTestCaseDto } from './dto/update-uat-test-case.dto';
import { CreateUatExecutionDto } from './dto/create-uat-execution.dto';
import { UpdateUatExecutionDto } from './dto/update-uat-execution.dto';
import { ListUatCyclesQueryDto } from './dto/list-uat-cycles-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@AuditTrail('UatCycle')
@Controller('uat-cycles')
@UseGuards(AuthGuard, PermissionsGuard)
export class UatController {
  constructor(private readonly uatService: UatService) {}

  @Get()
  @RequirePermission('uat:read')
  findAll(@Query() query: ListUatCyclesQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.uatService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('uat:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.uatService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('uat:write')
  create(@Body() dto: CreateUatCycleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.uatService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('uat:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUatCycleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('uat:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.uatService.remove(id, actor);
  }

  @Post(':id/sign-off')
  @RequirePermission('uat:approve')
  signOff(
    @Param('id') id: string,
    @Body() dto: SignOffUatCycleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.signOff(id, dto, actor);
  }

  @Post(':id/test-cases')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('uat:write')
  addTestCase(
    @Param('id') id: string,
    @Body() dto: CreateUatTestCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.addTestCase(id, dto, actor);
  }

  @Patch(':id/test-cases/:testCaseId')
  @RequirePermission('uat:write')
  updateTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: UpdateUatTestCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.updateTestCase(id, testCaseId, dto, actor);
  }

  @Delete(':id/test-cases/:testCaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('uat:manage')
  removeTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.removeTestCase(id, testCaseId, actor);
  }

  @Post(':id/test-cases/:testCaseId/executions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('uat:execute')
  addExecution(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: CreateUatExecutionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.addExecution(id, testCaseId, dto, actor);
  }

  @Patch(':id/test-cases/:testCaseId/executions/:executionId')
  @RequirePermission('uat:execute')
  updateExecution(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Param('executionId') executionId: string,
    @Body() dto: UpdateUatExecutionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.updateExecution(id, testCaseId, executionId, dto, actor);
  }

  @Delete(':id/test-cases/:testCaseId/executions/:executionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('uat:manage')
  removeExecution(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Param('executionId') executionId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.uatService.removeExecution(id, testCaseId, executionId, actor);
  }
}
