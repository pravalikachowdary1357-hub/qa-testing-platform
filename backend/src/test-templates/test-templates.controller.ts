import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TestTemplatesService } from './test-templates.service';
import {
  CreateTestTemplateDto,
  UpdateTestTemplateDto,
} from './dto/test-template.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('test-templates')
@UseGuards(AuthGuard, PermissionsGuard)
export class TestTemplatesController {
  constructor(private readonly service: TestTemplatesService) {}

  // Test authors (test_templates:read only) see enabled templates; only
  // template managers see disabled ones.
  @Get()
  @RequirePermission('test_templates:read')
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.findAll(
      !actor.permissions.includes('test_templates:manage'),
    );
  }

  @Post()
  @RequirePermission('test_templates:manage')
  create(
    @Body() dto: CreateTestTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('test_templates:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('test_templates:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.remove(id, actor);
  }
}
