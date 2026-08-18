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

@Controller('automations')
@UseGuards(AuthGuard, PermissionsGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  @RequirePermission('automation:read')
  findAll(@Query() query: ListAutomationQueryDto) {
    return this.automationService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('automation:read')
  findOne(@Param('id') id: string) {
    return this.automationService.findOne(id);
  }

  @Post()
  @RequirePermission('automation:write')
  create(@Body() dto: CreateAutomationDto) {
    return this.automationService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('automation:write')
  update(@Param('id') id: string, @Body() dto: UpdateAutomationDto) {
    return this.automationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('automation:manage')
  remove(@Param('id') id: string) {
    return this.automationService.remove(id);
  }

  @Post(':id/runs')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('automation:execute')
  recordRun(@Param('id') id: string, @Body() dto: CreateAutomationRunDto) {
    return this.automationService.recordRun(id, dto);
  }
}
