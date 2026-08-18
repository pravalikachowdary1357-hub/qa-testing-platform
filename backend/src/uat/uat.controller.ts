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

@Controller('uat-cycles')
@UseGuards(AuthGuard, PermissionsGuard)
export class UatController {
  constructor(private readonly uatService: UatService) {}

  @Get()
  @RequirePermission('uat:read')
  findAll(@Query() query: ListUatCyclesQueryDto) {
    return this.uatService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('uat:read')
  findOne(@Param('id') id: string) {
    return this.uatService.findOne(id);
  }

  @Post()
  @RequirePermission('uat:write')
  create(@Body() dto: CreateUatCycleDto) {
    return this.uatService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('uat:write')
  update(@Param('id') id: string, @Body() dto: UpdateUatCycleDto) {
    return this.uatService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('uat:manage')
  remove(@Param('id') id: string) {
    return this.uatService.remove(id);
  }

  @Post(':id/sign-off')
  @RequirePermission('uat:approve')
  signOff(@Param('id') id: string, @Body() dto: SignOffUatCycleDto) {
    return this.uatService.signOff(id, dto);
  }

  @Post(':id/test-cases')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('uat:write')
  addTestCase(@Param('id') id: string, @Body() dto: CreateUatTestCaseDto) {
    return this.uatService.addTestCase(id, dto);
  }

  @Patch(':id/test-cases/:testCaseId')
  @RequirePermission('uat:write')
  updateTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: UpdateUatTestCaseDto,
  ) {
    return this.uatService.updateTestCase(id, testCaseId, dto);
  }

  @Delete(':id/test-cases/:testCaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('uat:manage')
  removeTestCase(@Param('id') id: string, @Param('testCaseId') testCaseId: string) {
    return this.uatService.removeTestCase(id, testCaseId);
  }

  @Post(':id/test-cases/:testCaseId/executions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('uat:execute')
  addExecution(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: CreateUatExecutionDto,
  ) {
    return this.uatService.addExecution(id, testCaseId, dto);
  }

  @Patch(':id/test-cases/:testCaseId/executions/:executionId')
  @RequirePermission('uat:execute')
  updateExecution(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Param('executionId') executionId: string,
    @Body() dto: UpdateUatExecutionDto,
  ) {
    return this.uatService.updateExecution(id, testCaseId, executionId, dto);
  }

  @Delete(':id/test-cases/:testCaseId/executions/:executionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('uat:manage')
  removeExecution(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.uatService.removeExecution(id, testCaseId, executionId);
  }
}
