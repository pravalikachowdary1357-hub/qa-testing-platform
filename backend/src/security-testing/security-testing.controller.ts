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
import { SecurityTestingService } from './security-testing.service';
import { CreateSecurityTestDto } from './dto/create-security-test.dto';
import { UpdateSecurityTestDto } from './dto/update-security-test.dto';
import { CompleteSecurityTestDto } from './dto/complete-security-test.dto';
import { CreateSecurityFindingDto } from './dto/create-security-finding.dto';
import { UpdateSecurityFindingDto } from './dto/update-security-finding.dto';
import { ListSecurityTestsQueryDto } from './dto/list-security-tests-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('security-tests')
@UseGuards(AuthGuard, PermissionsGuard)
export class SecurityTestingController {
  constructor(private readonly securityTestingService: SecurityTestingService) {}

  @Get()
  @RequirePermission('security_testing:read')
  findAll(@Query() query: ListSecurityTestsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.securityTestingService.findAll(query.productId, actor.organizationId);
  }

  // Must be declared before ':id' -- otherwise Nest would match "summary" as
  // an :id path param instead of routing here.
  @Get('summary')
  @RequirePermission('security_testing:read')
  summary(@Query() query: ListSecurityTestsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.securityTestingService.summary(query.productId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermission('security_testing:read')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.securityTestingService.findOne(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('security_testing:write')
  create(@Body() dto: CreateSecurityTestDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.securityTestingService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('security_testing:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSecurityTestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.securityTestingService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('security_testing:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.securityTestingService.remove(id, actor);
  }

  @Post(':id/execute')
  @RequirePermission('security_testing:execute')
  execute(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.securityTestingService.execute(id, actor);
  }

  @Post(':id/complete')
  @RequirePermission('security_testing:execute')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteSecurityTestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.securityTestingService.complete(id, dto, actor);
  }

  @Post(':id/findings')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('security_testing:write')
  addFinding(
    @Param('id') id: string,
    @Body() dto: CreateSecurityFindingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.securityTestingService.addFinding(id, dto, actor);
  }

  @Patch(':id/findings/:findingId')
  @RequirePermission('security_testing:write')
  updateFinding(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Body() dto: UpdateSecurityFindingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.securityTestingService.updateFinding(id, findingId, dto, actor);
  }

  @Delete(':id/findings/:findingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('security_testing:manage')
  removeFinding(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.securityTestingService.removeFinding(id, findingId, actor);
  }
}
