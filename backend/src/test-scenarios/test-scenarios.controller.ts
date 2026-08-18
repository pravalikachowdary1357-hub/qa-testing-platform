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
import { TestScenariosService } from './test-scenarios.service';
import { CreateTestScenarioDto } from './dto/create-test-scenario.dto';
import { UpdateTestScenarioDto } from './dto/update-test-scenario.dto';
import { ListTestScenariosQueryDto } from './dto/list-test-scenarios-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('test-scenarios')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestScenariosController {
  constructor(private readonly testScenariosService: TestScenariosService) {}

  @Get()
  @RequirePermission('test_scenarios:read')
  findAll(@Query() query: ListTestScenariosQueryDto) {
    return this.testScenariosService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('test_scenarios:read')
  findOne(@Param('id') id: string) {
    return this.testScenariosService.findOne(id);
  }

  @Post()
  @RequirePermission('test_scenarios:write')
  create(@Body() dto: CreateTestScenarioDto) {
    return this.testScenariosService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('test_scenarios:write')
  update(@Param('id') id: string, @Body() dto: UpdateTestScenarioDto) {
    return this.testScenariosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('test_scenarios:manage')
  remove(@Param('id') id: string) {
    return this.testScenariosService.remove(id);
  }
}
