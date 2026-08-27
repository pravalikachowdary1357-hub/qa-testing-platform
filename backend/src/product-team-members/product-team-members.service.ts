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

const USER_SELECT = { select: { id: true, name: true, email: true } };

@Injectable()
export class ProductTeamMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string) {
    return this.prisma.productTeamMember.findMany({
      where: { productId },
      include: { user: USER_SELECT },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateProductTeamMemberDto, actor: AuthenticatedUser) {
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

  async remove(id: string, actor: AuthenticatedUser) {
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
