import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProductTeamMemberDto } from './dto/create-product-team-member.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization } from '../common/organization-scope.util';

const USER_SELECT = { select: { id: true, name: true, email: true } };

@Injectable()
export class ProductTeamMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string, actorOrganizationId: string | null) {
    return this.prisma.productTeamMember.findMany({
      where: {
        productId,
        ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
      },
      include: { user: USER_SELECT },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateProductTeamMemberDto, actor: AuthenticatedUser) {
    const productOrganizationId = await this.assertProductInScope(dto.productId, actor.organizationId);

    // The product's team roster must stay within the product's own
    // organization -- checked against the product's organization directly
    // (not the actor's), so this also holds for an unscoped actor
    // administering multiple organizations. Mirrors TeamsService.addMember's
    // identical check for team membership.
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { organizationId: true },
    });
    if (!user) {
      throw new BadRequestException(`User ${dto.userId} not found`);
    }
    if (user.organizationId !== productOrganizationId) {
      throw new BadRequestException(
        `User ${dto.userId} does not belong to this product's organization.`,
      );
    }

    let created;
    try {
      created = await this.prisma.productTeamMember.create({
        data: dto,
        include: { user: USER_SELECT },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('This user is already on the product team.');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Product or user not found.');
        }
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'ProductTeamMember',
      entityId: created.id,
      summary: `Added ${created.user.name} to the team for product ${dto.productId}`,
    });
    return created;
  }

  private async assertProductInScope(productId: string, actorOrganizationId: string | null): Promise<string> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { organizationId: true },
    });
    if (!product) {
      throw new BadRequestException(`Product ${productId} not found`);
    }
    assertSameOrganization(actorOrganizationId, product.organizationId, `Product ${productId} not found`);
    return product.organizationId;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existingWithScope = await this.prisma.productTeamMember.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existingWithScope) {
      throw new NotFoundException(`Product team member ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existingWithScope.product.organizationId,
      `Product team member ${id} not found`,
    );

    let existing;
    try {
      existing = await this.prisma.productTeamMember.delete({
        where: { id },
        include: { user: USER_SELECT },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product team member ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'ProductTeamMember',
      entityId: id,
      summary: `Removed ${existing.user.name} from the team for product ${existing.productId}`,
    });
  }
}
