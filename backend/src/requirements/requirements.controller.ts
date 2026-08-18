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
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { ListRequirementsQueryDto } from './dto/list-requirements-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('requirements')
@UseGuards(AuthGuard, PermissionsGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  @RequirePermission('requirements:read')
  findAll(@Query() query: ListRequirementsQueryDto) {
    return this.requirementsService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('requirements:read')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }

  @Post()
  @RequirePermission('requirements:write')
  create(@Body() dto: CreateRequirementDto) {
    return this.requirementsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('requirements:write')
  update(@Param('id') id: string, @Body() dto: UpdateRequirementDto) {
    return this.requirementsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('requirements:manage')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
  }
}
