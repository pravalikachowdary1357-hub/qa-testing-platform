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
import { AutomationService } from './automation.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { CreateAutomationRunDto } from './dto/create-automation-run.dto';
import { ListAutomationQueryDto } from './dto/list-automation-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('automations')
@UseGuards(AuthGuard, PermissionsGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  @RequirePermission('automation:read')
  findAll(@Query() query: ListAutomationQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.automationService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('automation:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.automationService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('automation:write')
  create(@Body() dto: CreateAutomationDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.automationService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('automation:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.automationService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('automation:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.automationService.remove(id, actor);
  }

  @Post(':id/runs')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('automation:execute')
  recordRun(
    @Param('id') id: string,
    @Body() dto: CreateAutomationRunDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.automationService.recordRun(id, dto, actor);
  }
}
