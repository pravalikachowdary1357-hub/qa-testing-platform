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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { ListEnvironmentsQueryDto } from './dto/list-environments-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('environments')
@UseGuards(AuthGuard, PermissionsGuard)
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  @RequirePermission('environments:read')
  findAll(@Query() query: ListEnvironmentsQueryDto) {
    return this.environmentsService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('environments:read')
  findOne(@Param('id') id: string) {
    return this.environmentsService.findOne(id);
  }

  @Post()
  @RequirePermission('environments:write')
  create(@Body() dto: CreateEnvironmentDto) {
    return this.environmentsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('environments:write')
  update(@Param('id') id: string, @Body() dto: UpdateEnvironmentDto) {
    return this.environmentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('environments:manage')
  remove(@Param('id') id: string) {
    return this.environmentsService.remove(id);
  }
}
