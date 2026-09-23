import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { assertSameOrganization } from '../common/organization-scope.util';

@Injectable()
export class ProductComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string, actorOrganizationId: string | null) {
    return this.prisma.productComponent.findMany({
      where: {
        productId,
        ...(actorOrganizationId ? { product: { organizationId: actorOrganizationId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateProductComponentDto, actor: AuthenticatedUser) {
    await this.assertProductInScope(dto.productId, actor.organizationId);

    let created;
    try {
      created = await this.prisma.productComponent.create({ data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'ProductComponent',
      entityId: created.id,
      summary: `Added component "${created.name}" to product ${dto.productId}`,
    });
    return created;
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

  async remove(id: string, actor: AuthenticatedUser) {
    const existingWithScope = await this.prisma.productComponent.findUnique({
      where: { id },
      select: { product: { select: { organizationId: true } } },
    });
    if (!existingWithScope) {
      throw new NotFoundException(`Product component ${id} not found`);
    }
    assertSameOrganization(
      actor.organizationId,
      existingWithScope.product.organizationId,
      `Product component ${id} not found`,
    );

    let existing;
    try {
      existing = await this.prisma.productComponent.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Product component ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'ProductComponent',
      entityId: id,
      summary: `Removed component "${existing.name}" from product ${existing.productId}`,
    });
  }
}
