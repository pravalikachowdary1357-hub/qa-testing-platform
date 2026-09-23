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
import { PerformanceTestingService } from './performance-testing.service';
import { CreatePerformanceTestDto } from './dto/create-performance-test.dto';
import { UpdatePerformanceTestDto } from './dto/update-performance-test.dto';
import { ListPerformanceTestsQueryDto } from './dto/list-performance-tests-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('performance-tests')
@UseGuards(AuthGuard, PermissionsGuard)
export class PerformanceTestingController {
  constructor(private readonly performanceTestingService: PerformanceTestingService) {}

  @Get()
  @RequirePermission('performance_testing:read')
  findAll(@Query() query: ListPerformanceTestsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.performanceTestingService.findAll(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('performance_testing:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.performanceTestingService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('performance_testing:write')
  create(@Body() dto: CreatePerformanceTestDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.performanceTestingService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('performance_testing:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePerformanceTestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.performanceTestingService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('performance_testing:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.performanceTestingService.remove(id, actor);
  }

  @Post(':id/run')
  @RequirePermission('performance_testing:execute')
  run(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.performanceTestingService.run(id, actor);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('performance_testing:execute')
  stop(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.performanceTestingService.stop(id, actor);
  }
}
