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
import { ApiTestingService } from './api-testing.service';
import { CreateApiTestRequestDto } from './dto/create-api-test-request.dto';
import { UpdateApiTestRequestDto } from './dto/update-api-test-request.dto';
import { ListApiTestRequestsQueryDto } from './dto/list-api-test-requests-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('api-testing')
@UseGuards(AuthGuard, PermissionsGuard)
export class ApiTestingController {
  constructor(private readonly apiTestingService: ApiTestingService) {}

  @Get()
  @RequirePermission('api_testing:read')
  findAll(@Query() query: ListApiTestRequestsQueryDto) {
    return this.apiTestingService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('api_testing:read')
  findOne(@Param('id') id: string) {
    return this.apiTestingService.findOne(id);
  }

  @Post()
  @RequirePermission('api_testing:write')
  create(@Body() dto: CreateApiTestRequestDto) {
    return this.apiTestingService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('api_testing:write')
  update(@Param('id') id: string, @Body() dto: UpdateApiTestRequestDto) {
    return this.apiTestingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('api_testing:manage')
  remove(@Param('id') id: string) {
    return this.apiTestingService.remove(id);
  }

  @Post(':id/execute')
  @RequirePermission('api_testing:execute')
  execute(@Param('id') id: string) {
    return this.apiTestingService.execute(id);
  }
}
