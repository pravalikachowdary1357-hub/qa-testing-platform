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
import { TestPlansService } from './test-plans.service';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';
import { ListTestPlansQueryDto } from './dto/list-test-plans-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('test-plans')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestPlansController {
  constructor(private readonly testPlansService: TestPlansService) {}

  @Get()
  @RequirePermission('test_plans:read')
  findAll(@Query() query: ListTestPlansQueryDto) {
    return this.testPlansService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('test_plans:read')
  findOne(@Param('id') id: string) {
    return this.testPlansService.findOne(id);
  }

  @Post()
  @RequirePermission('test_plans:write')
  create(@Body() dto: CreateTestPlanDto) {
    return this.testPlansService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('test_plans:write')
  update(@Param('id') id: string, @Body() dto: UpdateTestPlanDto) {
    return this.testPlansService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_plans:manage')
  remove(@Param('id') id: string) {
    return this.testPlansService.remove(id);
  }
}
