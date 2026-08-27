import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Injectable()
export class ProductComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string) {
    return this.prisma.productComponent.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateProductComponentDto, actor: AuthenticatedUser) {
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

  async remove(id: string, actor: AuthenticatedUser) {
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
