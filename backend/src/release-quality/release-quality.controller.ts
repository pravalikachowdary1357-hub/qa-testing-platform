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

@Controller('releases')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReleaseQualityController {
  constructor(private readonly releaseQualityService: ReleaseQualityService) {}

  @Get()
  @RequirePermission('release_quality:read')
  findAll(@Query() query: ListReleasesQueryDto) {
    return this.releaseQualityService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('release_quality:read')
  findOne(@Param('id') id: string) {
    return this.releaseQualityService.findOne(id);
  }

  @Post()
  @RequirePermission('release_quality:write')
  create(@Body() dto: CreateReleaseDto) {
    return this.releaseQualityService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('release_quality:write')
  update(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.releaseQualityService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('release_quality:manage')
  remove(@Param('id') id: string) {
    return this.releaseQualityService.remove(id);
  }

  @Post(':id/sign-off')
  @RequirePermission('release_quality:approve')
  signOff(@Param('id') id: string, @Body() dto: SignOffReleaseDto) {
    return this.releaseQualityService.signOff(id, dto);
  }
}
