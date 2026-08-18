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

@Controller('performance-tests')
@UseGuards(AuthGuard, PermissionsGuard)
export class PerformanceTestingController {
  constructor(private readonly performanceTestingService: PerformanceTestingService) {}

  @Get()
  @RequirePermission('performance_testing:read')
  findAll(@Query() query: ListPerformanceTestsQueryDto) {
    return this.performanceTestingService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('performance_testing:read')
  findOne(@Param('id') id: string) {
    return this.performanceTestingService.findOne(id);
  }

  @Post()
  @RequirePermission('performance_testing:write')
  create(@Body() dto: CreatePerformanceTestDto) {
    return this.performanceTestingService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('performance_testing:write')
  update(@Param('id') id: string, @Body() dto: UpdatePerformanceTestDto) {
    return this.performanceTestingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('performance_testing:manage')
  remove(@Param('id') id: string) {
    return this.performanceTestingService.remove(id);
  }

  @Post(':id/run')
  @RequirePermission('performance_testing:execute')
  run(@Param('id') id: string) {
    return this.performanceTestingService.run(id);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('performance_testing:execute')
  stop(@Param('id') id: string) {
    return this.performanceTestingService.stop(id);
  }
}
