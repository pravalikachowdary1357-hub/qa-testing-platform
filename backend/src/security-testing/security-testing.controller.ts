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

@Controller('security-tests')
@UseGuards(AuthGuard, PermissionsGuard)
export class SecurityTestingController {
  constructor(private readonly securityTestingService: SecurityTestingService) {}

  @Get()
  @RequirePermission('security_testing:read')
  findAll(@Query() query: ListSecurityTestsQueryDto) {
    return this.securityTestingService.findAll(query.productId);
  }

  // Must be declared before ':id' -- otherwise Nest would match "summary" as
  // an :id path param instead of routing here.
  @Get('summary')
  @RequirePermission('security_testing:read')
  summary(@Query() query: ListSecurityTestsQueryDto) {
    return this.securityTestingService.summary(query.productId);
  }

  @Get(':id')
  @RequirePermission('security_testing:read')
  findOne(@Param('id') id: string) {
    return this.securityTestingService.findOne(id);
  }

  @Post()
  @RequirePermission('security_testing:write')
  create(@Body() dto: CreateSecurityTestDto) {
    return this.securityTestingService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('security_testing:write')
  update(@Param('id') id: string, @Body() dto: UpdateSecurityTestDto) {
    return this.securityTestingService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('security_testing:manage')
  remove(@Param('id') id: string) {
    return this.securityTestingService.remove(id);
  }

  @Post(':id/execute')
  @RequirePermission('security_testing:execute')
  execute(@Param('id') id: string) {
    return this.securityTestingService.execute(id);
  }

  @Post(':id/complete')
  @RequirePermission('security_testing:execute')
  complete(@Param('id') id: string, @Body() dto: CompleteSecurityTestDto) {
    return this.securityTestingService.complete(id, dto);
  }

  @Post(':id/findings')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('security_testing:write')
  addFinding(@Param('id') id: string, @Body() dto: CreateSecurityFindingDto) {
    return this.securityTestingService.addFinding(id, dto);
  }

  @Patch(':id/findings/:findingId')
  @RequirePermission('security_testing:write')
  updateFinding(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Body() dto: UpdateSecurityFindingDto,
  ) {
    return this.securityTestingService.updateFinding(id, findingId, dto);
  }

  @Delete(':id/findings/:findingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('security_testing:manage')
  removeFinding(@Param('id') id: string, @Param('findingId') findingId: string) {
    return this.securityTestingService.removeFinding(id, findingId);
  }
}
