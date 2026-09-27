import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { OPEN_DEFECT_STATUSES } from '../defects/defect-status';

// Four summary figures for the top of every module page ("module
// dashboard"). Each module is gated by the same read permission as the
// module page itself, and every count is limited to the selected product
// (or, without one, to the user's organization).

export type StatTone = 'primary' | 'success' | 'warning' | 'error' | 'info';
export interface ModuleStat {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  tone: StatTone;
}

const MODULE_PERMISSION: Record<string, string> = {
  requirements: 'requirements:read',
  'test-planning': 'test_plans:read',
  'test-scenarios': 'test_scenarios:read',
  'test-cases': 'test_cases:read',
  'test-data': 'test_data:read',
  environments: 'environments:read',
  'test-execution': 'test_executions:read',
  defects: 'defects:read',
  automation: 'automation:read',
  'api-testing': 'api_testing:read',
  'performance-testing': 'performance_testing:read',
  'security-testing': 'security_testing:read',
  uat: 'uat:read',
  traceability: 'traceability:read',
  'release-quality': 'release_quality:read',
  reports: 'reports:read',
  ai: 'ai:read',
  organization: 'organizations:read',
  projects: 'projects:read',
  products: 'products:read',
  settings: 'users:read',
};

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

@Injectable()
export class ModuleStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    actor: AuthenticatedUser,
    module: string,
    productId?: string,
  ): Promise<ModuleStat[]> {
    const permission = MODULE_PERMISSION[module];
    if (!permission) throw new NotFoundException(`Unknown module ${module}`);
    if (!actor.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
    if (productId) await this.assertProduct(productId, actor);

    const org = actor.organizationId;
    // Where-clause fragments: product-scoped, or organization-scoped.
    const product = productId
      ? { productId }
      : org
        ? { product: { organizationId: org } }
        : {};
    const viaScenario = productId
      ? { testScenario: { productId } }
      : org
        ? { testScenario: { product: { organizationId: org } } }
        : {};
    const viaCase = productId
      ? { testCase: { testScenario: { productId } } }
      : org
        ? { testCase: { testScenario: { product: { organizationId: org } } } }
        : {};
    const p = this.prisma;
    const s = (
      key: string,
      label: string,
      value: number | string,
      tone: StatTone,
      hint?: string,
    ): ModuleStat => ({
      key,
      label,
      value,
      tone,
      hint,
    });

    switch (module) {
      case 'requirements': {
        const [total, review, approved, risky] = await Promise.all([
          p.requirement.count({ where: product }),
          p.requirement.count({ where: { ...product, status: 'IN_REVIEW' } }),
          p.requirement.count({
            where: {
              ...product,
              status: { in: ['APPROVED', 'IMPLEMENTED', 'VERIFIED'] },
            },
          }),
          p.requirement.count({
            where: { ...product, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
          }),
        ]);
        return [
          s('total', 'Total Requirements', total, 'primary'),
          s('review', 'In Review', review, 'warning', 'Waiting for approval'),
          s(
            'approved',
            'Approved',
            approved,
            'success',
            `${pct(approved, total)}% of all`,
          ),
          s('risk', 'High / Critical Risk', risky, 'error'),
        ];
      }
      case 'test-planning': {
        const [total, active, review, done] = await Promise.all([
          p.testPlan.count({ where: product }),
          p.testPlan.count({ where: { ...product, status: 'ACTIVE' } }),
          p.testPlan.count({ where: { ...product, status: 'IN_REVIEW' } }),
          p.testPlan.count({ where: { ...product, status: 'COMPLETED' } }),
        ]);
        return [
          s('total', 'Test Plans', total, 'primary'),
          s('active', 'Active', active, 'info'),
          s('review', 'In Review', review, 'warning'),
          s('done', 'Completed', done, 'success'),
        ];
      }
      case 'test-scenarios': {
        const [total, regression, ready, blocked] = await Promise.all([
          p.testScenario.count({ where: product }),
          p.testScenario.count({ where: { ...product, type: 'REGRESSION' } }),
          p.testScenario.count({
            where: { ...product, status: { in: ['READY', 'COMPLETED'] } },
          }),
          p.testScenario.count({ where: { ...product, status: 'BLOCKED' } }),
        ]);
        return [
          s('total', 'Test Scenarios', total, 'primary'),
          s('regression', 'Regression', regression, 'info'),
          s('ready', 'Ready / Completed', ready, 'success'),
          s('blocked', 'Blocked', blocked, 'error'),
        ];
      }
      case 'test-cases': {
        const [total, approved, ready, automated] = await Promise.all([
          p.testCase.count({ where: viaScenario }),
          p.testCase.count({ where: { ...viaScenario, status: 'APPROVED' } }),
          p.testCase.count({ where: { ...viaScenario, status: 'READY' } }),
          p.testCase.count({
            where: { ...viaScenario, automations: { some: {} } },
          }),
        ]);
        return [
          s('total', 'Test Cases', total, 'primary'),
          s('approved', 'Approved', approved, 'success'),
          s('ready', 'Ready for Review', ready, 'warning'),
          s(
            'automated',
            'Automated',
            automated,
            'info',
            `${pct(automated, total)}% coverage`,
          ),
        ];
      }
      case 'test-data': {
        const [total, linked, credentials] = await Promise.all([
          p.testData.count({ where: viaCase }),
          p.testData.count({
            where: { ...viaCase, testCaseId: { not: null } },
          }),
          p.testData.count({ where: { ...viaCase, type: 'CREDENTIALS' } }),
        ]);
        const types = await p.testData.groupBy({
          by: ['type'],
          where: viaCase,
        });
        return [
          s('total', 'Test Data Sets', total, 'primary'),
          s('linked', 'Linked to Test Cases', linked, 'success'),
          s('credentials', 'Credentials (masked)', credentials, 'warning'),
          s('types', 'Data Types Used', types.length, 'info'),
        ];
      }
      case 'environments': {
        const [total, active, maintenance, inactive] = await Promise.all([
          p.environment.count({ where: product }),
          p.environment.count({ where: { ...product, status: 'ACTIVE' } }),
          p.environment.count({ where: { ...product, status: 'MAINTENANCE' } }),
          p.environment.count({ where: { ...product, status: 'INACTIVE' } }),
        ]);
        return [
          s('total', 'Environments', total, 'primary'),
          s('active', 'Active', active, 'success'),
          s('maintenance', 'Maintenance', maintenance, 'warning'),
          s('inactive', 'Inactive', inactive, 'error'),
        ];
      }
      case 'test-execution': {
        const [total, pass, fail, blocked] = await Promise.all([
          p.testExecution.count({ where: viaCase }),
          p.testExecution.count({ where: { ...viaCase, status: 'PASS' } }),
          p.testExecution.count({ where: { ...viaCase, status: 'FAIL' } }),
          p.testExecution.count({ where: { ...viaCase, status: 'BLOCKED' } }),
        ]);
        return [
          s('total', 'Executions', total, 'primary'),
          s(
            'pass',
            'Passed',
            pass,
            'success',
            `${pct(pass, total)}% pass rate`,
          ),
          s('fail', 'Failed', fail, 'error'),
          s('blocked', 'Blocked', blocked, 'warning'),
        ];
      }
      case 'defects': {
        const [open, critical, retest, closed] = await Promise.all([
          p.defect.count({
            where: { ...product, status: { in: OPEN_DEFECT_STATUSES } },
          }),
          p.defect.count({
            where: {
              ...product,
              status: { in: OPEN_DEFECT_STATUSES },
              severity: 'CRITICAL',
            },
          }),
          p.defect.count({
            where: {
              ...product,
              status: { in: ['FIXED', 'READY_FOR_RETEST', 'RESOLVED'] },
            },
          }),
          p.defect.count({
            where: {
              ...product,
              status: {
                in: ['CLOSED', 'REJECTED', 'DUPLICATE', 'CANNOT_REPRODUCE'],
              },
            },
          }),
        ]);
        return [
          s('open', 'Open Defects', open, 'primary'),
          s('critical', 'Critical Open', critical, 'error'),
          s('retest', 'Awaiting Retest', retest, 'warning'),
          s('closed', 'Closed', closed, 'success'),
        ];
      }
      case 'automation': {
        const [total, enabled, pass, fail] = await Promise.all([
          p.automation.count({ where: viaCase }),
          p.automation.count({ where: { ...viaCase, enabled: true } }),
          p.automation.count({ where: { ...viaCase, lastRunStatus: 'PASS' } }),
          p.automation.count({
            where: { ...viaCase, lastRunStatus: { in: ['FAIL', 'BLOCKED'] } },
          }),
        ]);
        return [
          s('total', 'Automated Scripts', total, 'primary'),
          s('enabled', 'Enabled', enabled, 'info'),
          s('pass', 'Last Run Passed', pass, 'success'),
          s('fail', 'Failing', fail, 'error'),
        ];
      }
      case 'api-testing': {
        const requests = await p.apiTestRequest.findMany({
          where: product,
          select: {
            executions: {
              orderBy: { executedAt: 'desc' },
              take: 1,
              select: { passed: true },
            },
          },
        });
        const run = requests.filter((r) => r.executions.length > 0);
        const passed = run.filter(
          (r) => r.executions[0].passed === true,
        ).length;
        return [
          s('total', 'API Requests', requests.length, 'primary'),
          s('run', 'Executed', run.length, 'info'),
          s(
            'pass',
            'Passing',
            passed,
            'success',
            `${pct(passed, run.length)}% of executed`,
          ),
          s('fail', 'Failing', run.length - passed, 'error'),
        ];
      }
      case 'performance-testing': {
        const [total, passed, failed, never] = await Promise.all([
          p.performanceTest.count({ where: product }),
          p.performanceTest.count({
            where: { ...product, lastRunStatus: 'PASSED' },
          }),
          p.performanceTest.count({
            where: { ...product, lastRunStatus: 'FAILED' },
          }),
          p.performanceTest.count({
            where: { ...product, lastRunStatus: null },
          }),
        ]);
        return [
          s('total', 'Performance Tests', total, 'primary'),
          s('passed', 'Passed', passed, 'success'),
          s('failed', 'Failed', failed, 'error'),
          s('never', 'Not Run Yet', never, 'warning'),
        ];
      }
      case 'security-testing': {
        const viaTest = productId
          ? { securityTest: { productId } }
          : org
            ? { securityTest: { product: { organizationId: org } } }
            : {};
        const [total, failed, openFindings, criticalFindings] =
          await Promise.all([
            p.securityTest.count({ where: product }),
            p.securityTest.count({ where: { ...product, status: 'FAILED' } }),
            p.securityFinding.count({
              where: {
                ...viaTest,
                status: { in: ['OPEN', 'IN_PROGRESS', 'REOPENED'] },
              },
            }),
            p.securityFinding.count({
              where: {
                ...viaTest,
                status: { in: ['OPEN', 'IN_PROGRESS', 'REOPENED'] },
                severity: { in: ['CRITICAL', 'HIGH'] },
              },
            }),
          ]);
        return [
          s('total', 'Security Tests', total, 'primary'),
          s('failed', 'Failed Tests', failed, 'error'),
          s('open', 'Open Findings', openFindings, 'warning'),
          s('critical', 'Critical / High Open', criticalFindings, 'error'),
        ];
      }
      case 'uat': {
        const [total, active, awaiting, approved] = await Promise.all([
          p.uatCycle.count({ where: product }),
          p.uatCycle.count({
            where: { ...product, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
          }),
          p.uatCycle.count({ where: { ...product, status: 'COMPLETED' } }),
          p.uatCycle.count({ where: { ...product, status: 'APPROVED' } }),
        ]);
        return [
          s('total', 'UAT Cycles', total, 'primary'),
          s('active', 'Planned / In Progress', active, 'info'),
          s('awaiting', 'Awaiting Sign-off', awaiting, 'warning'),
          s('approved', 'Approved', approved, 'success'),
        ];
      }
      case 'traceability': {
        const [total, covered, executed] = await Promise.all([
          p.requirement.count({ where: product }),
          p.requirement.count({
            where: { ...product, testScenarios: { some: {} } },
          }),
          p.requirement.count({
            where: {
              ...product,
              testScenarios: {
                some: { testCases: { some: { testExecutions: { some: {} } } } },
              },
            },
          }),
        ]);
        return [
          s('total', 'Requirements', total, 'primary'),
          s('covered', 'Covered by Tests', covered, 'success'),
          s('uncovered', 'Not Covered', total - covered, 'error'),
          s(
            'coverage',
            'Executed Coverage',
            `${pct(executed, total)}%`,
            'info',
            `${executed} requirement(s) tested`,
          ),
        ];
      }
      case 'release-quality': {
        const [total, testing, awaiting, approved] = await Promise.all([
          p.release.count({ where: product }),
          p.release.count({ where: { ...product, status: 'IN_TESTING' } }),
          p.release.count({ where: { ...product, status: 'COMPLETED' } }),
          p.release.count({ where: { ...product, status: 'APPROVED' } }),
        ]);
        return [
          s('total', 'Releases', total, 'primary'),
          s('testing', 'In Testing', testing, 'info'),
          s('awaiting', 'Awaiting Sign-off', awaiting, 'warning'),
          s('approved', 'Approved', approved, 'success'),
        ];
      }
      case 'reports': {
        const [executions, passed, open, critical] = await Promise.all([
          p.testExecution.count({ where: viaCase }),
          p.testExecution.count({ where: { ...viaCase, status: 'PASS' } }),
          p.defect.count({
            where: { ...product, status: { in: OPEN_DEFECT_STATUSES } },
          }),
          p.defect.count({
            where: {
              ...product,
              status: { in: OPEN_DEFECT_STATUSES },
              severity: 'CRITICAL',
            },
          }),
        ]);
        return [
          s('executions', 'Executions', executions, 'primary'),
          s('passRate', 'Pass Rate', `${pct(passed, executions)}%`, 'success'),
          s('open', 'Open Defects', open, 'warning'),
          s('critical', 'Critical Defects', critical, 'error'),
        ];
      }
      case 'ai': {
        const scope = productId
          ? { productId }
          : org
            ? { product: { organizationId: org } }
            : {};
        const [total, pending, accepted, rejected] = await Promise.all([
          p.aiSuggestion.count({ where: scope }),
          p.aiSuggestion.count({ where: { ...scope, status: 'PENDING' } }),
          p.aiSuggestion.count({
            where: {
              ...scope,
              status: { in: ['ACCEPTED', 'EDITED_AND_ACCEPTED'] },
            },
          }),
          p.aiSuggestion.count({ where: { ...scope, status: 'REJECTED' } }),
        ]);
        return [
          s('total', 'AI Suggestions', total, 'primary'),
          s('pending', 'Pending Review', pending, 'warning'),
          s('accepted', 'Accepted', accepted, 'success'),
          s('rejected', 'Rejected', rejected, 'error'),
        ];
      }
      case 'organization': {
        const where = org ? { organizationId: org } : {};
        const [units, teams, products, users] = await Promise.all([
          p.businessUnit.count({ where }),
          p.team.count({ where }),
          p.product.count({ where }),
          p.user.count({ where }),
        ]);
        return [
          s('units', 'Business Units', units, 'primary'),
          s('teams', 'Teams', teams, 'info'),
          s('products', 'Products', products, 'success'),
          s('users', 'Users', users, 'warning'),
        ];
      }
      case 'projects': {
        const where = org ? { organizationId: org } : {};
        const [total, active, inactive, products] = await Promise.all([
          p.project.count({ where }),
          p.project.count({ where: { ...where, status: 'ACTIVE' } }),
          p.project.count({ where: { ...where, status: 'INACTIVE' } }),
          p.product.count({ where: { ...where, projectId: { not: null } } }),
        ]);
        return [
          s('total', 'Projects', total, 'primary'),
          s('active', 'Active', active, 'success'),
          s('inactive', 'Inactive', inactive, 'warning'),
          s('products', 'Linked Products', products, 'info'),
        ];
      }
      case 'products': {
        const where = org ? { organizationId: org } : {};
        const [total, active, hold, deprecated] = await Promise.all([
          p.product.count({ where }),
          p.product.count({ where: { ...where, status: 'ACTIVE' } }),
          p.product.count({ where: { ...where, status: 'ON_HOLD' } }),
          p.product.count({ where: { ...where, status: 'DEPRECATED' } }),
        ]);
        return [
          s('total', 'Total Products', total, 'primary'),
          s('active', 'Active', active, 'success'),
          s('hold', 'On Hold', hold, 'warning'),
          s('deprecated', 'Deprecated', deprecated, 'error'),
        ];
      }
      case 'settings': {
        const where = org ? { organizationId: org } : {};
        const [users, active, roles, recent] = await Promise.all([
          p.user.count({ where }),
          p.user.count({ where: { ...where, status: 'ACTIVE' } }),
          p.role.count(),
          p.auditLog.count({
            where: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          }),
        ]);
        return [
          s('users', 'Total Users', users, 'primary'),
          s('active', 'Active Users', active, 'success'),
          s('roles', 'Roles', roles, 'info'),
          s('audit', 'Audit Events (7 days)', recent, 'warning'),
        ];
      }
      default:
        throw new NotFoundException(`Unknown module ${module}`);
    }
  }

  private async assertProduct(productId: string, actor: AuthenticatedUser) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { organizationId: true },
    });
    if (
      !product ||
      (actor.organizationId && product.organizationId !== actor.organizationId)
    ) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
  }
}
