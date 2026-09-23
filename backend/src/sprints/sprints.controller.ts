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
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { ListSprintsQueryDto } from './dto/list-sprints-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

// Sub-records of Release -- gated by the existing release_quality permission
// keys rather than a new namespace, same reasoning as product-components
// reusing products:*. GET carries no @RequirePermission for the same reason
// the Product Workspace's other sub-resource GETs don't: this is workspace
// detail shown alongside the always-visible Product Overview, not a gated
// capability of its own.
@Controller('sprints')
@UseGuards(AuthGuard, PermissionsGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  findAll(@Query() query: ListSprintsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.sprintsService.findAll(query.productId, actor.organizationId);
  }

  @Post()
  @RequirePermission('release_quality:write')
  create(
    @Body() dto: CreateSprintDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sprintsService.create(dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('release_quality:write')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.sprintsService.remove(id, actor);
  }
}
