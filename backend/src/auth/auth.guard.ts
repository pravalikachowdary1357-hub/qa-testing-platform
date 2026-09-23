import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { hashSessionToken } from './password.util';
import { AuthenticatedUser } from './current-user.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is invalid or has expired.');
    }
    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    const authenticatedUser: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      status: session.user.status,
      roleId: session.user.roleId,
      roleName: session.user.role.name,
      permissions: session.user.role.rolePermissions.map(
        (rp) => rp.permission.key,
      ),
      emailNotificationsEnabled: session.user.emailNotificationsEnabled,
      organizationId: session.user.organizationId,
    };

    (request as Request & { user: AuthenticatedUser }).user =
      authenticatedUser;
    (request as Request & { sessionId: string }).sessionId = session.id;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}
