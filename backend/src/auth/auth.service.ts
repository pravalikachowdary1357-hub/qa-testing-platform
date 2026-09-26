import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  comparePassword,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
} from './password.util';
import { AuthenticatedUser } from './current-user.decorator';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto, userAgent: string | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    if (!user || !(await comparePassword(dto.password, user.passwordHash))) {
      // Security logging: a failed attempt against a real account is
      // recorded on that account. Unknown emails have no user to attach
      // the entry to, and the password is never logged.
      if (user)
        await this.recordSignIn(
          user.id,
          'login-failed',
          'Failed sign-in (wrong password)',
          userAgent,
        );
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (user.status !== 'ACTIVE') {
      await this.recordSignIn(
        user.id,
        'login-failed',
        'Failed sign-in (account deactivated)',
        userAgent,
      );
      throw new UnauthorizedException('This account has been deactivated.');
    }

    const token = generateSessionToken();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        userAgent,
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.recordSignIn(
      user.id,
      'login',
      `Signed in: ${user.name}`,
      userAgent,
    );

    return {
      token,
      user: this.toAuthenticatedUser(user),
    };
  }

  async logout(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, user: { select: { name: true } } },
    });
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
    if (session)
      await this.recordSignIn(
        session.userId,
        'logout',
        `Signed out: ${session.user.name}`,
        undefined,
      );
  }

  // Sign-in activity for the audit trail (user activity tracking). Written
  // directly so a failure here never blocks signing in or out.
  private async recordSignIn(
    userId: string,
    action: string,
    summary: string,
    userAgent: string | undefined,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action,
          entityType: 'Session',
          entityId: userId,
          summary,
          metadata: userAgent
            ? JSON.stringify({ userAgent: userAgent.slice(0, 300) })
            : null,
        },
      });
    } catch {
      // Best effort only.
    }
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      current: session.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException(`Session ${sessionId} not found.`);
    }
    await this.prisma.session.delete({ where: { id: sessionId } });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
    if (!(await comparePassword(dto.currentPassword, user.passwordHash))) {
      throw new ForbiddenException('Current password is incorrect.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    roleId: string;
    organizationId: string | null;
    emailNotificationsEnabled: boolean;
    role: {
      name: string;
      rolePermissions: { permission: { key: string } }[];
    };
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      organizationId: user.organizationId,
    };
  }
}
