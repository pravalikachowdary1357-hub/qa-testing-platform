import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpMethod, PerformanceRunStatus } from '../../generated/prisma/enums.js';
import { CreatePerformanceTestDto } from './dto/create-performance-test.dto';
import { UpdatePerformanceTestDto } from './dto/update-performance-test.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';

const PRODUCT_REF = { select: { id: true, name: true, organizationId: true } };
const ENVIRONMENT_REF = { select: { id: true, name: true, baseUrl: true } };
const RELEASE_REF = { select: { id: true, name: true, version: true } };

const RELATION_INCLUDE = {
  product: PRODUCT_REF,
  environment: ENVIRONMENT_REF,
  release: RELEASE_REF,
};

const LIST_INCLUDE = {
  ...RELATION_INCLUDE,
  runs: {
    take: 1,
    orderBy: { startedAt: 'desc' as const },
    select: {
      id: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      totalRequests: true,
      failedRequests: true,
      avgResponseTimeMs: true,
      throughputRps: true,
      errorRatePercent: true,
      thresholdsPassed: true,
    },
  },
};

const DETAIL_INCLUDE = {
  ...RELATION_INCLUDE,
  runs: { orderBy: { startedAt: 'desc' as const } },
};

// virtualUsers/durationSeconds are capped in the DTOs (Max 50 / Max 60): the
// duration cap keeps a run well inside a serverless function's execution
// ceiling (Vercel's hard cap is 60s), and the virtual-user cap keeps this from
// being mistaken for an external load-testing tool aimed at someone else's
// infrastructure.

// Sleeping between staggered virtual-user start times.
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface LoadResult {
  totalRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number | null;
  minResponseTimeMs: number | null;
  maxResponseTimeMs: number | null;
  p95ResponseTimeMs: number | null;
  throughputRps: number;
  errorRatePercent: number;
  stoppedEarly: boolean;
}

@Injectable()
export class PerformanceTestingService {
  constructor(private readonly prisma: PrismaService) {}

  // In-memory registry of in-flight runs, keyed by performanceTestId. This is
  // deliberately not persisted: it exists only so a concurrent POST .../stop
  // request (on the SAME server process) can cooperatively cancel an in-flight
  // run's request loop. On a serverless deployment where /run and /stop can
  // land on different function instances, /stop cannot reach an in-flight run
  // on another instance -- the run still finishes on its own (bounded by
  // durationSeconds/iterations) and records genuine results either way. This
  // limitation is surfaced honestly in the frontend rather than papered over.
  private readonly activeRuns = new Map<string, AbortController>();

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.performanceTest.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      include: LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!test) {
      throw new NotFoundException(`Performance test ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, test.product.organizationId, `Performance test ${id} not found`);

    return test;
  }

  async create(dto: CreatePerformanceTestDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    if (dto.environmentId) {
      await this.validateEnvironmentBelongsToProduct(dto.productId, dto.environmentId);
    }

    try {
      return await this.prisma.performanceTest.create({
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          environmentId: dto.environmentId,
          name: dto.name,
          description: dto.description,
          targetUrl: dto.targetUrl,
          method: dto.method,
          headers: dto.headers,
          body: dto.body,
          virtualUsers: dto.virtualUsers,
          rampUpSeconds: dto.rampUpSeconds,
          durationSeconds: dto.durationSeconds,
          iterations: dto.iterations,
          thresholdResponseTimeMs: dto.thresholdResponseTimeMs,
          thresholdErrorRatePercent: dto.thresholdErrorRatePercent,
          thresholdThroughputRps: dto.thresholdThroughputRps,
        },
        include: LIST_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Product or environment reference not found');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePerformanceTestDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.performanceTest.findUnique({
      where: { id },
      include: { product: { select: { organizationId: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Performance test ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Performance test ${id} not found`);

    if (this.activeRuns.has(id)) {
      throw new ConflictException('This performance test cannot be edited while a run is in progress.');
    }

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveEnvironmentId =
      dto.environmentId !== undefined ? dto.environmentId : existing.environmentId;

    if (effectiveEnvironmentId) {
      await this.validateEnvironmentBelongsToProduct(effectiveProductId, effectiveEnvironmentId);
    }

    try {
      return await this.prisma.performanceTest.update({
        where: { id },
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          environmentId: dto.environmentId,
          name: dto.name,
          description: dto.description,
          targetUrl: dto.targetUrl,
          method: dto.method,
          headers: dto.headers,
          body: dto.body,
          virtualUsers: dto.virtualUsers,
          rampUpSeconds: dto.rampUpSeconds,
          durationSeconds: dto.durationSeconds,
          iterations: dto.iterations,
          thresholdResponseTimeMs: dto.thresholdResponseTimeMs,
          thresholdErrorRatePercent: dto.thresholdErrorRatePercent,
          thresholdThroughputRps: dto.thresholdThroughputRps,
        },
        include: LIST_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Performance test ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Product or environment reference not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.performanceTest.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Performance test ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `Performance test ${id} not found`);

    if (this.activeRuns.has(id)) {
      throw new ConflictException('This performance test cannot be deleted while a run is in progress.');
    }

    try {
      await this.prisma.performanceTest.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Performance test ${id} not found`);
      }
      throw error;
    }
  }

  async run(id: string, actor: AuthenticatedUser) {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id },
      include: {
        environment: { select: { baseUrl: true } },
        product: { select: { organizationId: true } },
      },
    });

    if (!test) {
      throw new NotFoundException(`Performance test ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, test.product.organizationId, `Performance test ${id} not found`);

    if (this.activeRuns.has(id)) {
      throw new ConflictException('A run is already in progress for this performance test.');
    }

    const effectiveUrl = this.buildEffectiveUrl(test.targetUrl, test.environment?.baseUrl ?? null);

    const controller = new AbortController();
    this.activeRuns.set(id, controller);

    const startedAt = new Date();
    const run = await this.prisma.performanceTestRun.create({
      data: { performanceTestId: id, status: PerformanceRunStatus.QUEUED, startedAt },
    });
    await this.prisma.performanceTest.update({
      where: { id },
      data: { lastRunStatus: PerformanceRunStatus.QUEUED, lastRunAt: startedAt },
    });

    try {
      await this.prisma.performanceTestRun.update({
        where: { id: run.id },
        data: { status: PerformanceRunStatus.RUNNING },
      });
      await this.prisma.performanceTest.update({
        where: { id },
        data: { lastRunStatus: PerformanceRunStatus.RUNNING },
      });

      const result = await this.executeLoad(
        effectiveUrl,
        test.method,
        (test.headers as Record<string, string> | null) ?? {},
        test.body,
        test.virtualUsers,
        test.rampUpSeconds,
        test.durationSeconds,
        test.iterations,
        controller,
      );

      const { status, errorMessage, thresholdsPassed } = this.evaluateOutcome(test, result);
      const finishedAt = new Date();

      const finalRun = await this.prisma.performanceTestRun.update({
        where: { id: run.id },
        data: {
          status,
          finishedAt,
          totalRequests: result.totalRequests,
          failedRequests: result.failedRequests,
          avgResponseTimeMs: result.avgResponseTimeMs,
          minResponseTimeMs: result.minResponseTimeMs,
          maxResponseTimeMs: result.maxResponseTimeMs,
          p95ResponseTimeMs: result.p95ResponseTimeMs,
          throughputRps: result.throughputRps,
          errorRatePercent: result.errorRatePercent,
          thresholdsPassed,
          errorMessage,
        },
      });
      await this.prisma.performanceTest.update({
        where: { id },
        data: { lastRunStatus: status, lastRunAt: startedAt },
      });

      return finalRun;
    } finally {
      this.activeRuns.delete(id);
    }
  }

  async stop(id: string, actor: AuthenticatedUser) {
    const test = await this.prisma.performanceTest.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!test) {
      throw new NotFoundException(`Performance test ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, test.product.organizationId, `Performance test ${id} not found`);

    const controller = this.activeRuns.get(id);

    if (!controller) {
      throw new BadRequestException(
        'No in-progress run found for this performance test on this server process. ' +
          'If this app is deployed on serverless infrastructure, Stop can only reach a run ' +
          'in-flight on the same function instance -- the run will still finish on its own.',
      );
    }

    controller.abort();
    return { message: 'Stop requested. The run will finalize shortly.' };
  }

  private async executeLoad(
    url: string,
    method: HttpMethod,
    headers: Record<string, string>,
    body: string | null,
    virtualUsers: number,
    rampUpSeconds: number,
    durationSeconds: number,
    iterations: number | null,
    controller: AbortController,
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const durationMs = durationSeconds * 1000;
    const rampUpMs = rampUpSeconds * 1000;
    const iterationCap = iterations ?? Infinity;
    const includeBody = method !== HttpMethod.GET && method !== HttpMethod.DELETE;

    let completedIterations = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];

    const vuLoop = async (vuIndex: number) => {
      const startDelay = virtualUsers > 1 ? (vuIndex / virtualUsers) * rampUpMs : 0;
      if (startDelay > 0) await sleep(startDelay);

      while (
        Date.now() - startTime < durationMs &&
        completedIterations < iterationCap &&
        !controller.signal.aborted
      ) {
        completedIterations += 1;
        const reqStart = Date.now();
        try {
          const response = await fetch(url, {
            method,
            headers,
            body: includeBody ? (body ?? undefined) : undefined,
            signal: controller.signal,
          });
          await response.arrayBuffer().catch(() => undefined);
          responseTimes.push(Date.now() - reqStart);
          if (!response.ok) failedRequests += 1;
        } catch {
          responseTimes.push(Date.now() - reqStart);
          failedRequests += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: virtualUsers }, (_, i) => vuLoop(i)));

    const actualElapsedSeconds = Math.max((Date.now() - startTime) / 1000, 0.001);
    const totalRequests = responseTimes.length;
    const sorted = [...responseTimes].sort((a, b) => a - b);

    return {
      totalRequests,
      failedRequests,
      avgResponseTimeMs: totalRequests
        ? responseTimes.reduce((sum, t) => sum + t, 0) / totalRequests
        : null,
      minResponseTimeMs: totalRequests ? sorted[0] : null,
      maxResponseTimeMs: totalRequests ? sorted[sorted.length - 1] : null,
      p95ResponseTimeMs: totalRequests
        ? sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)]
        : null,
      throughputRps: totalRequests / actualElapsedSeconds,
      errorRatePercent: totalRequests ? (failedRequests / totalRequests) * 100 : 0,
      stoppedEarly: controller.signal.aborted,
    };
  }

  private evaluateOutcome(
    test: { thresholdResponseTimeMs: number | null; thresholdErrorRatePercent: number | null; thresholdThroughputRps: number | null },
    result: LoadResult,
  ): { status: PerformanceRunStatus; errorMessage: string | null; thresholdsPassed: boolean | null } {
    if (result.stoppedEarly) {
      return { status: PerformanceRunStatus.STOPPED, errorMessage: null, thresholdsPassed: null };
    }

    if (result.totalRequests === 0) {
      return {
        status: PerformanceRunStatus.FAILED,
        errorMessage: 'No requests completed within the configured duration.',
        thresholdsPassed: false,
      };
    }

    const hasThresholds =
      test.thresholdResponseTimeMs != null ||
      test.thresholdErrorRatePercent != null ||
      test.thresholdThroughputRps != null;

    let thresholdsMet = true;
    if (test.thresholdResponseTimeMs != null) {
      thresholdsMet = thresholdsMet && (result.avgResponseTimeMs ?? Infinity) <= test.thresholdResponseTimeMs;
    }
    if (test.thresholdErrorRatePercent != null) {
      thresholdsMet = thresholdsMet && result.errorRatePercent <= test.thresholdErrorRatePercent;
    }
    if (test.thresholdThroughputRps != null) {
      thresholdsMet = thresholdsMet && result.throughputRps >= test.thresholdThroughputRps;
    }

    // A 100% error rate means every single request failed -- the target was
    // unreachable or erroring throughout. That is never a PASS, regardless of
    // whether the user configured explicit thresholds: PASSED must mean the
    // target genuinely responded, the same "never fake success" rule applied
    // to Automation/API Testing elsewhere in this app. Any error rate short
    // of total failure is left entirely to the user's own configured
    // threshold (or no judgement at all, if they set none).
    const allRequestsFailed = result.errorRatePercent >= 100;

    return {
      status:
        !allRequestsFailed && (!hasThresholds || thresholdsMet)
          ? PerformanceRunStatus.PASSED
          : PerformanceRunStatus.FAILED,
      errorMessage: allRequestsFailed
        ? 'Every request failed -- the target may be unreachable or returning errors.'
        : null,
      thresholdsPassed: hasThresholds ? thresholdsMet : null,
    };
  }

  private async assertProductInScope(productId: string, actorOrganizationId: string | null): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { organizationId: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    assertSameOrganization(actorOrganizationId, product.organizationId, `Product ${productId} not found`);
  }

  private async validateEnvironmentBelongsToProduct(productId: string, environmentId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true, productId: true },
    });

    if (!environment) {
      throw new BadRequestException(`Environment ${environmentId} not found`);
    }

    if (environment.productId !== productId) {
      throw new BadRequestException(
        `Environment ${environmentId} does not belong to the selected product.`,
      );
    }
  }

  private buildEffectiveUrl(rawUrl: string, baseUrl: string | null): string {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    if (baseUrl) {
      const trimmedBase = baseUrl.replace(/\/+$/, '');
      const pathPart = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return `${trimmedBase}${pathPart}`;
    }
    throw new BadRequestException(
      'This target URL is relative but no environment with a base URL is selected.',
    );
  }
}
