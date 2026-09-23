import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BuildsService } from './builds.service';
import { CreateBuildDto } from './dto/create-build.dto';
import { ListBuildsQueryDto } from './dto/list-builds-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

// Same reasoning as sprints.controller.ts: sub-records of Release, reusing
// release_quality permissions, GET left unguarded as Product Workspace detail.
@Controller('builds')
@UseGuards(AuthGuard, PermissionsGuard)
export class BuildsController {
  constructor(private readonly buildsService: BuildsService) {}

  @Get()
  findAll(@Query() query: ListBuildsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.buildsService.findAll(query.productId, actor.organizationId);
  }

  @Post()
  @RequirePermission('release_quality:write')
  create(@Body() dto: CreateBuildDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.buildsService.create(dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('release_quality:write')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.buildsService.remove(id, actor);
  }
}
