import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

const RELEASE_REF_SELECT = { select: { id: true, name: true, version: true } };

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(productId: string) {
    return this.prisma.sprint.findMany({
      where: { release: { productId } },
      include: { release: RELEASE_REF_SELECT },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateSprintDto, actor: AuthenticatedUser) {
    let created;
    try {
      created = await this.prisma.sprint.create({
        data: dto,
        include: { release: RELEASE_REF_SELECT },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Release ${dto.releaseId} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'Sprint',
      entityId: created.id,
      summary: `Added sprint "${created.name}" to release ${dto.releaseId}`,
    });
    return created;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    let existing;
    try {
      existing = await this.prisma.sprint.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Sprint ${id} not found`);
      }
      throw error;
    }

    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'Sprint',
      entityId: id,
      summary: `Removed sprint "${existing.name}" from release ${existing.releaseId}`,
    });
  }
}
