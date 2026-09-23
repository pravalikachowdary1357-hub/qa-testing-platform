import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  ReleaseQualityFilterDto,
  ReportFilterDto,
  StatusFilterDto,
  StatusSeverityFilterDto,
  TestCaseStatusFilterDto,
} from './dto/report-filter.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('reports')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermission('reports:read')
  getOverview(@Query() filter: ReportFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getOverview(filter, actor.organizationId);
  }

  @Get('test-executions')
  @RequirePermission('reports:read')
  getTestExecutions(@Query() filter: StatusFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getTestExecutionReport(filter, filter.status, actor.organizationId);
  }

  @Get('test-case-status')
  @RequirePermission('reports:read')
  getTestCaseStatus(@Query() filter: TestCaseStatusFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getTestCaseStatusReport(
      filter,
      filter.lifecycleStatus,
      filter.resultStatus,
      actor.organizationId,
    );
  }

  @Get('requirement-coverage')
  @RequirePermission('reports:read')
  getRequirementCoverage(@Query() filter: ReportFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getRequirementCoverageReport(filter, actor.organizationId);
  }

  @Get('traceability')
  @RequirePermission('reports:read')
  getTraceability(@Query() filter: ReportFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getTraceabilityReport(filter, actor.organizationId);
  }

  @Get('defects')
  @RequirePermission('reports:read')
  getDefects(@Query() filter: StatusSeverityFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getDefectReport(filter, filter.status, filter.severity, actor.organizationId);
  }

  @Get('automation')
  @RequirePermission('reports:read')
  getAutomation(@Query() filter: StatusFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getAutomationReport(filter, filter.status, actor.organizationId);
  }

  @Get('api-testing')
  @RequirePermission('reports:read')
  getApiTesting(@Query() filter: StatusFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getApiTestingReport(filter, filter.status, actor.organizationId);
  }

  @Get('performance')
  @RequirePermission('reports:read')
  getPerformance(@Query() filter: StatusFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getPerformanceReport(filter, filter.status, actor.organizationId);
  }

  @Get('security')
  @RequirePermission('reports:read')
  getSecurity(@Query() filter: StatusSeverityFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getSecurityReport(filter, filter.status, filter.severity, actor.organizationId);
  }

  @Get('uat')
  @RequirePermission('reports:read')
  getUat(@Query() filter: StatusFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getUatReport(filter, filter.status, actor.organizationId);
  }

  @Get('release-quality')
  @RequirePermission('reports:read')
  getReleaseQuality(@Query() filter: ReleaseQualityFilterDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.reportsService.getReleaseQualityReport(filter, filter.status, filter.readiness, actor.organizationId);
  }
}
