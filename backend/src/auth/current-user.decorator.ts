import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  status: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  emailNotificationsEnabled: boolean;
  // Null for a user with no organization assigned -- treated as unscoped
  // (sees across every organization) everywhere organization-level data
  // isolation is enforced, matching today's behavior for every existing
  // user until an admin explicitly assigns one.
  organizationId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);

export const CurrentSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ sessionId: string }>();
    return request.sessionId;
  },
);
