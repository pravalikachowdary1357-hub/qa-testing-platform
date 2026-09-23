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
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { ListBusinessUnitsQueryDto } from './dto/list-business-units-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('business-units')
@UseGuards(AuthGuard, PermissionsGuard)
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Get()
  @RequirePermission('business_units:read')
  findAll(
    @Query() query: ListBusinessUnitsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.businessUnitsService.findAll(query.organizationId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('business_units:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.businessUnitsService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('business_units:write')
  create(
    @Body() dto: CreateBusinessUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.businessUnitsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('business_units:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.businessUnitsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('business_units:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.businessUnitsService.remove(id, actor);
  }
}
