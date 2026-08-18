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

@Controller('reports')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermission('reports:read')
  getOverview(@Query() filter: ReportFilterDto) {
    return this.reportsService.getOverview(filter);
  }

  @Get('test-executions')
  @RequirePermission('reports:read')
  getTestExecutions(@Query() filter: StatusFilterDto) {
    return this.reportsService.getTestExecutionReport(filter, filter.status);
  }

  @Get('test-case-status')
  @RequirePermission('reports:read')
  getTestCaseStatus(@Query() filter: TestCaseStatusFilterDto) {
    return this.reportsService.getTestCaseStatusReport(filter, filter.lifecycleStatus, filter.resultStatus);
  }

  @Get('requirement-coverage')
  @RequirePermission('reports:read')
  getRequirementCoverage(@Query() filter: ReportFilterDto) {
    return this.reportsService.getRequirementCoverageReport(filter);
  }

  @Get('traceability')
  @RequirePermission('reports:read')
  getTraceability(@Query() filter: ReportFilterDto) {
    return this.reportsService.getTraceabilityReport(filter);
  }

  @Get('defects')
  @RequirePermission('reports:read')
  getDefects(@Query() filter: StatusSeverityFilterDto) {
    return this.reportsService.getDefectReport(filter, filter.status, filter.severity);
  }

  @Get('automation')
  @RequirePermission('reports:read')
  getAutomation(@Query() filter: StatusFilterDto) {
    return this.reportsService.getAutomationReport(filter, filter.status);
  }

  @Get('api-testing')
  @RequirePermission('reports:read')
  getApiTesting(@Query() filter: StatusFilterDto) {
    return this.reportsService.getApiTestingReport(filter, filter.status);
  }

  @Get('performance')
  @RequirePermission('reports:read')
  getPerformance(@Query() filter: StatusFilterDto) {
    return this.reportsService.getPerformanceReport(filter, filter.status);
  }

  @Get('security')
  @RequirePermission('reports:read')
  getSecurity(@Query() filter: StatusSeverityFilterDto) {
    return this.reportsService.getSecurityReport(filter, filter.status, filter.severity);
  }

  @Get('uat')
  @RequirePermission('reports:read')
  getUat(@Query() filter: StatusFilterDto) {
    return this.reportsService.getUatReport(filter, filter.status);
  }

  @Get('release-quality')
  @RequirePermission('reports:read')
  getReleaseQuality(@Query() filter: ReleaseQualityFilterDto) {
    return this.reportsService.getReleaseQualityReport(filter, filter.status, filter.readiness);
  }
}
