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
import { ReleaseQualityService } from './release-quality.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { SignOffReleaseDto } from './dto/sign-off-release.dto';
import { ListReleasesQueryDto } from './dto/list-releases-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('releases')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReleaseQualityController {
  constructor(private readonly releaseQualityService: ReleaseQualityService) {}

  @Get()
  @RequirePermission('release_quality:read')
  findAll(@Query() query: ListReleasesQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.releaseQualityService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('release_quality:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.releaseQualityService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('release_quality:write')
  create(@Body() dto: CreateReleaseDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.releaseQualityService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('release_quality:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReleaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.releaseQualityService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('release_quality:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.releaseQualityService.remove(id, actor);
  }

  @Post(':id/sign-off')
  @RequirePermission('release_quality:approve')
  signOff(
    @Param('id') id: string,
    @Body() dto: SignOffReleaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.releaseQualityService.signOff(id, dto, actor);
  }
}
