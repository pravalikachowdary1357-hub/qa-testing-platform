import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './require-permission.decorator';
import { AuthenticatedUser } from './current-user.decorator';

// Runs after AuthGuard has attached request.user. Reads the permission key
// declared via @RequirePermission(...) and checks it against the
// authenticated user's role-derived permission set -- the single source of
// truth is the RolePermission table, never a frontend check.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    if (!request.user?.permissions.includes(required)) {
      throw new ForbiddenException(
        `You do not have the required permission: ${required}.`,
      );
    }
    return true;
  }
}
