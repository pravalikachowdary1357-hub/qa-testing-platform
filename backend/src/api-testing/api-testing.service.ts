import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { ApiAuthType, HttpMethod } from '../../generated/prisma/enums.js';
import { CreateApiTestRequestDto } from './dto/create-api-test-request.dto';
import { UpdateApiTestRequestDto } from './dto/update-api-test-request.dto';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization, productOrganizationScopeWhere } from '../common/organization-scope.util';

const PRODUCT_REF = { select: { id: true, name: true, organizationId: true } };
const ENVIRONMENT_REF = { select: { id: true, name: true, baseUrl: true } };
const RELEASE_REF = { select: { id: true, name: true, version: true } };

const RELATION_INCLUDE = {
  product: PRODUCT_REF,
  release: RELEASE_REF,
  environment: ENVIRONMENT_REF,
};

// The `authConfig` column can hold real secrets (bearer tokens, basic-auth
// passwords, API key values), so the list endpoint deliberately omits it via
// a `select` -- only the single-record detail endpoint (findOne) returns it.
const LIST_SELECT = {
  id: true,
  productId: true,
  releaseId: true,
  environmentId: true,
  name: true,
  method: true,
  url: true,
  headers: true,
  queryParams: true,
  body: true,
  authType: true,
  expectedStatus: true,
  createdAt: true,
  updatedAt: true,
  product: PRODUCT_REF,
  release: RELEASE_REF,
  environment: ENVIRONMENT_REF,
  executions: {
    take: 1,
    orderBy: { executedAt: 'desc' as const },
    select: {
      id: true,
      statusCode: true,
      passed: true,
      responseTimeMs: true,
      executedAt: true,
    },
  },
};

const MAX_RESPONSE_BODY_LENGTH = 200000;
const REQUEST_TIMEOUT_MS = 15000;

@Injectable()
export class ApiTestingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId: string | undefined, actorOrganizationId: string | null) {
    return this.prisma.apiTestRequest.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...productOrganizationScopeWhere(actorOrganizationId),
      },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actorOrganizationId: string | null) {
    const record = await this.prisma.apiTestRequest.findUnique({
      where: { id },
      include: {
        ...RELATION_INCLUDE,
        executions: { orderBy: { executedAt: 'desc' } },
      },
    });

    if (!record) {
      throw new NotFoundException(`API test request ${id} not found`);
    }
    assertSameOrganization(actorOrganizationId, record.product.organizationId, `API test request ${id} not found`);

    return record;
  }

  async create(dto: CreateApiTestRequestDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);
    if (dto.environmentId) {
      await this.validateEnvironmentBelongsToProduct(dto.productId, dto.environmentId);
    }

    const authType = dto.authType ?? ApiAuthType.NONE;
    const authConfig = this.resolveAuthConfig(authType, dto.authConfig);

    try {
      return await this.prisma.apiTestRequest.create({
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          environmentId: dto.environmentId,
          name: dto.name,
          method: dto.method,
          url: dto.url,
          headers: dto.headers,
          queryParams: dto.queryParams,
          body: dto.body,
          authType: dto.authType,
          authConfig,
          expectedStatus: dto.expectedStatus,
        },
        include: RELATION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Product or environment reference not found');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateApiTestRequestDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.apiTestRequest.findUnique({
      where: { id },
      include: { product: { select: { organizationId: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`API test request ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `API test request ${id} not found`);

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveEnvironmentId =
      dto.environmentId !== undefined ? dto.environmentId : existing.environmentId;

    if (effectiveEnvironmentId) {
      await this.validateEnvironmentBelongsToProduct(effectiveProductId, effectiveEnvironmentId);
    }

    const effectiveAuthType = dto.authType ?? existing.authType;
    const effectiveAuthConfig =
      dto.authConfig !== undefined
        ? dto.authConfig
        : ((existing.authConfig as Record<string, string> | null) ?? undefined);
    const authConfig = this.resolveAuthConfig(effectiveAuthType, effectiveAuthConfig);

    try {
      return await this.prisma.apiTestRequest.update({
        where: { id },
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          environmentId: dto.environmentId,
          name: dto.name,
          method: dto.method,
          url: dto.url,
          headers: dto.headers,
          queryParams: dto.queryParams,
          body: dto.body,
          authType: dto.authType,
          authConfig,
          expectedStatus: dto.expectedStatus,
        },
        include: RELATION_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`API test request ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Product or environment reference not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.apiTestRequest.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`API test request ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, existing.product.organizationId, `API test request ${id} not found`);

    try {
      await this.prisma.apiTestRequest.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`API test request ${id} not found`);
      }
      throw error;
    }
  }

  async execute(id: string, actor: AuthenticatedUser) {
    const request = await this.prisma.apiTestRequest.findUnique({
      where: { id },
      include: {
        environment: { select: { baseUrl: true } },
        product: { select: { organizationId: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`API test request ${id} not found`);
    }
    assertSameOrganization(actor.organizationId, request.product.organizationId, `API test request ${id} not found`);

    const effectiveUrl = this.buildEffectiveUrl(
      request.url,
      request.environment?.baseUrl ?? null,
      (request.queryParams as Record<string, string> | null) ?? {},
    );

    const headers: Record<string, string> = {
      ...((request.headers as Record<string, string> | null) ?? {}),
    };
    this.applyAuth(headers, request.authType, request.authConfig as Record<string, string> | null);

    const includeBody = request.method !== HttpMethod.GET && request.method !== HttpMethod.DELETE;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let statusCode: number | null = null;
    let responseHeaders: Record<string, string> | null = null;
    let responseBody: string | null = null;
    let passed: boolean | null = null;
    let errorMessage: string | null = null;
    let responseTimeMs: number;

    const startedAt = Date.now();
    try {
      const response = await fetch(effectiveUrl, {
        method: request.method,
        headers,
        body: includeBody ? (request.body ?? undefined) : undefined,
        signal: controller.signal,
      });
      responseTimeMs = Date.now() - startedAt;

      statusCode = response.status;
      responseHeaders = Object.fromEntries(response.headers.entries());
      const rawBody = await response.text();
      responseBody =
        rawBody.length > MAX_RESPONSE_BODY_LENGTH
          ? `${rawBody.slice(0, MAX_RESPONSE_BODY_LENGTH)}...(truncated)`
          : rawBody;
      passed = request.expectedStatus == null ? null : statusCode === request.expectedStatus;
    } catch (error) {
      responseTimeMs = Date.now() - startedAt;
      statusCode = null;
      responseHeaders = null;
      responseBody = null;
      passed = null;
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Request timed out after 15 seconds';
      } else if (error instanceof Error) {
        errorMessage = error.message || 'Request failed';
      } else {
        errorMessage = 'Request failed';
      }
    } finally {
      clearTimeout(timer);
    }

    return this.prisma.apiTestExecution.create({
      data: {
        apiRequestId: id,
        statusCode,
        responseTimeMs,
        responseHeaders: responseHeaders ?? Prisma.DbNull,
        responseBody,
        passed,
        errorMessage,
      },
    });
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

  private resolveAuthConfig(
    authType: ApiAuthType,
    authConfig: Record<string, string> | undefined,
  ): Record<string, string> | Prisma.NullableJsonNullValueInput {
    switch (authType) {
      case ApiAuthType.BEARER:
        if (!authConfig?.token || !authConfig.token.trim()) {
          throw new BadRequestException('Bearer auth requires a token.');
        }
        return authConfig;
      case ApiAuthType.BASIC:
        if (!authConfig?.username?.trim() || !authConfig?.password?.trim()) {
          throw new BadRequestException('Basic auth requires a username and password.');
        }
        return authConfig;
      case ApiAuthType.API_KEY:
        if (!authConfig?.headerName?.trim() || !authConfig?.value?.trim()) {
          throw new BadRequestException('API key auth requires a header name and value.');
        }
        return authConfig;
      case ApiAuthType.NONE:
      default:
        return Prisma.DbNull;
    }
  }

  private applyAuth(
    headers: Record<string, string>,
    authType: ApiAuthType,
    authConfig: Record<string, string> | null,
  ): void {
    switch (authType) {
      case ApiAuthType.BEARER:
        headers['Authorization'] = `Bearer ${authConfig?.token ?? ''}`;
        break;
      case ApiAuthType.BASIC: {
        const username = authConfig?.username ?? '';
        const password = authConfig?.password ?? '';
        headers['Authorization'] =
          `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        break;
      }
      case ApiAuthType.API_KEY: {
        const headerName = authConfig?.headerName;
        if (headerName) {
          headers[headerName] = authConfig?.value ?? '';
        }
        break;
      }
      case ApiAuthType.NONE:
      default:
        break;
    }
  }

  private buildEffectiveUrl(
    rawUrl: string,
    baseUrl: string | null,
    queryParams: Record<string, string>,
  ): string {
    let combinedUrl: string;

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      combinedUrl = rawUrl;
    } else if (baseUrl) {
      const trimmedBase = baseUrl.replace(/\/+$/, '');
      const pathPart = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      combinedUrl = `${trimmedBase}${pathPart}`;
    } else {
      throw new BadRequestException(
        'This request URL is relative but no environment with a base URL is selected.',
      );
    }

    const queryIndex = combinedUrl.indexOf('?');
    const basePath = queryIndex === -1 ? combinedUrl : combinedUrl.slice(0, queryIndex);
    const existingQuery = queryIndex === -1 ? '' : combinedUrl.slice(queryIndex + 1);

    const searchParams = new URLSearchParams(existingQuery);
    Object.entries(queryParams ?? {}).forEach(([key, value]) => {
      searchParams.set(key, value);
    });

    const queryString = searchParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }
}
