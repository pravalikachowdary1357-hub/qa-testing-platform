import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// TestSphere has no authentication/authorization system to hook per-user
// permissions into (confirmed: no User/Role model anywhere in the schema).
// This is the honest stand-in for "permission-based access" that the
// current architecture actually supports: a deployment-wide administrator
// switch, off by default only if explicitly disabled. It is NOT per-user
// RBAC -- see the AI module's report for that limitation spelled out.
@Injectable()
export class AiFeatureGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const disabled = (process.env.AI_FEATURES_ENABLED ?? 'true').toLowerCase() === 'false';
    if (disabled) {
      throw new ForbiddenException(
        'AI features are disabled for this deployment. Set AI_FEATURES_ENABLED=true to enable them.',
      );
    }
    return true;
  }
}
