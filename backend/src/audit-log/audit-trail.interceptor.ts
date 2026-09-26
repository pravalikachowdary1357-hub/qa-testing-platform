import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable, from, mergeMap } from 'rxjs';
import { PrismaService } from '../prisma.service';

// Audit coverage for the testing modules that do not write their own audit
// entries (UAT, release quality, executions, automation, API, performance
// and security testing). Every successful create / update / delete / action
// request on a controller marked with @AuditTrail('Entity') is recorded.
//
// Only a small whitelist of request fields is copied into the entry
// (decision, status, result...), never free request bodies: API test
// requests can carry headers and tokens that must not land in the log.
const AUDIT_ENTITY = 'auditTrailEntity';
const SAFE_BODY_FIELDS = [
  'decision',
  'status',
  'result',
  'severity',
  'environmentId',
  'testCaseId',
];
const SAFE_NOTE_FIELDS = ['signOffNotes', 'notes', 'comment'];

const AUDIT_SKIP = 'auditTrailSkip';

// For a handler whose service already writes its own audit entry (e.g. CSV
// import), so it is not recorded twice.
export const SkipAuditTrail = () => SetMetadata(AUDIT_SKIP, true);

export function AuditTrail(entityType: string) {
  return applyDecorators(
    SetMetadata(AUDIT_ENTITY, entityType),
    UseInterceptors(AuditTrailInterceptor),
  );
}

interface RequestLike {
  method: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { id: string; name?: string };
}

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditTrailInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.getAllAndOverride<string>(AUDIT_ENTITY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (this.reflector.get<boolean>(AUDIT_SKIP, context.getHandler()))
      return next.handle();
    const request = context.switchToHttp().getRequest<RequestLike>();
    const method = request.method?.toUpperCase();
    if (
      !entityType ||
      !request.user ||
      !['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)
    ) {
      return next.handle();
    }
    // The handler's own route (e.g. ':id/sign-off'), independent of any
    // global prefix or controller path.
    const handlerPath = this.reflector.get<string | string[]>(
      PATH_METADATA,
      context.getHandler(),
    );
    const routePath = `/base/${Array.isArray(handlerPath) ? handlerPath[0] : (handlerPath ?? '')}`;
    return next.handle().pipe(
      mergeMap((result: unknown) =>
        from(
          this.record(entityType, request, method, result, routePath)
            .catch((error: unknown) => {
              // Never fail the user's request because the audit write failed,
              // but make it visible in the server logs.
              this.logger.error(`Audit write failed: ${String(error)}`);
            })
            .then(() => result),
        ),
      ),
    );
  }

  private async record(
    entityType: string,
    request: RequestLike,
    method: string,
    result: unknown,
    routePath: string,
  ) {
    const { action, subject } = describeRoute(routePath, method);
    const body = request.body ?? {};
    const res = (result ?? {}) as Record<string, unknown>;
    const entityId = firstString(
      request.params?.id,
      request.params?.cycleId,
      request.params?.testId,
      res.id,
    );
    const name = firstString(res.name, res.title, body.name, body.title);

    const metadata: Record<string, unknown> = {};
    for (const field of SAFE_BODY_FIELDS) {
      if (typeof body[field] === 'string') metadata[field] = body[field];
    }
    for (const field of SAFE_NOTE_FIELDS) {
      if (typeof body[field] === 'string' && body[field])
        metadata[field] = String(body[field]).slice(0, 500);
    }
    for (const [key, value] of Object.entries(request.params ?? {})) {
      if (key !== 'id') metadata[key] = value;
    }

    const label = subject ? `${entityType} ${subject}` : entityType;
    const decision =
      typeof body.decision === 'string' ? ` (${body.decision})` : '';
    const summary = `${capitalize(verb(action))} ${label}${name ? ` "${name}"` : ''}${decision}`;

    await this.prisma.auditLog.create({
      data: {
        actorUserId: request.user!.id,
        action,
        entityType,
        entityId,
        summary,
        metadata: Object.keys(metadata).length
          ? JSON.stringify(metadata)
          : null,
      },
    });
  }
}

// '/uat/:id/sign-off' + POST -> action 'sign-off'
// '/uat/:id/test-cases/:testCaseId/executions' + POST -> 'create', subject 'test case execution'
// '/uat/:id' + PATCH -> 'update'
export function describeRoute(
  path: string,
  method: string,
): { action: string; subject: string } {
  const segments = path.split('/').filter(Boolean);
  const staticAfterBase = segments.slice(1).filter((s) => !s.startsWith(':'));
  const crud =
    method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update';
  if (staticAfterBase.length === 0) return { action: crud, subject: '' };
  const last = segments[segments.length - 1];
  const collections = new Set(['test-cases', 'executions', 'findings', 'runs']);
  // A trailing verb segment (sign-off, run, execute, stop, complete) is the action.
  if (!last.startsWith(':') && !collections.has(last)) {
    return {
      action: last,
      subject: staticAfterBase.slice(0, -1).map(singular).join(' '),
    };
  }
  return { action: crud, subject: staticAfterBase.map(singular).join(' ') };
}

function singular(segment: string) {
  return segment.replace(/-/g, ' ').replace(/s$/, '');
}

function verb(action: string) {
  const map: Record<string, string> = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    'sign-off': 'signed off',
    run: 'ran',
    execute: 'executed',
    stop: 'stopped',
    complete: 'completed',
  };
  return map[action] ?? action.replace(/-/g, ' ');
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values)
    if (typeof value === 'string' && value) return value;
  return undefined;
}
