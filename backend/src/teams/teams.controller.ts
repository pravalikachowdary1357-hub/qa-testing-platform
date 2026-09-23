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
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { ListTeamsQueryDto } from './dto/list-teams-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('teams')
@UseGuards(AuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequirePermission('teams:read')
  findAll(@Query() query: ListTeamsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.teamsService.findAll(query.organizationId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('teams:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.teamsService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('teams:write')
  create(@Body() dto: CreateTeamDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.teamsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('teams:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.teamsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('teams:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.teamsService.remove(id, actor);
  }

  @Post(':id/members')
  @RequirePermission('teams:write')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.teamsService.addMember(id, dto, actor);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('teams:write')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.teamsService.removeMember(id, memberId, actor);
  }
}
