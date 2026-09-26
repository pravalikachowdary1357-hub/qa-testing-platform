import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleDto, UpdateRoleDetailsDto } from './dto/role-details.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles:read')
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermission('roles:manage')
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.rolesService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('roles:manage')
  updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDetailsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.updateDetails(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('roles:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.rolesService.remove(id, actor);
  }

  @Patch(':id/permissions')
  @RequirePermission('roles:manage')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rolesService.updatePermissions(id, dto, actor);
  }
}

@Controller('permissions')
@UseGuards(AuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles:read')
  findAll() {
    return this.rolesService.listPermissionCatalog();
  }
}
