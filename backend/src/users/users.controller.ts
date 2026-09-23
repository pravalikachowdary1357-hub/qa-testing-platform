import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users:read')
  findAll(@Query() query: ListUsersQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.findAll(query, actor.organizationId);
  }

  @Patch('me')
  updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOwnProfileDto,
  ) {
    return this.usersService.updateOwnProfile(user.id, dto);
  }

  @Get(':id')
  @RequirePermission('users:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('users:manage')
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('users:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Patch(':id/status')
  @RequirePermission('users:manage')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto, actor);
  }
}
