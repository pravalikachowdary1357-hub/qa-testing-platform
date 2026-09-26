import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import {
  CreateTestTemplateDto,
  UpdateTestTemplateDto,
} from './dto/test-template.dto';

// Test-case templates are configuration only: they are never linked to, and
// never create or modify, TestCase rows.
@Injectable()
export class TestTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll(activeOnly = false) {
    return this.prisma.testCaseTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  private clean(dto: UpdateTestTemplateDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() || null }
        : {}),
      ...(dto.preconditions !== undefined
        ? { preconditions: dto.preconditions.trim() || null }
        : {}),
      ...(dto.expectedResult !== undefined
        ? { expectedResult: dto.expectedResult.trim() || null }
        : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.steps !== undefined
        ? {
            steps: dto.steps.map((s) => ({
              action: s.action.trim(),
              expectedResult: s.expectedResult.trim(),
            })) as Prisma.InputJsonValue,
          }
        : {}),
    };
  }

  private rethrow(error: unknown, name?: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException(
          `A template named "${name}" already exists.`,
        );
      if (error.code === 'P2025')
        throw new NotFoundException('Template not found');
    }
    throw error;
  }

  async create(dto: CreateTestTemplateDto, actor: AuthenticatedUser) {
    let created;
    try {
      created = await this.prisma.testCaseTemplate.create({
        data: {
          ...this.clean(dto),
          name: dto.name.trim(),
          createdByUserId: actor.id,
        },
      });
    } catch (error) {
      this.rethrow(error, dto.name);
    }
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'create',
      entityType: 'TestCaseTemplate',
      entityId: created.id,
      summary: `Created test case template "${created.name}"`,
    });
    return created;
  }

  async update(
    id: string,
    dto: UpdateTestTemplateDto,
    actor: AuthenticatedUser,
  ) {
    let updated;
    try {
      updated = await this.prisma.testCaseTemplate.update({
        where: { id },
        data: this.clean(dto),
      });
    } catch (error) {
      this.rethrow(error, dto.name);
    }
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'update',
      entityType: 'TestCaseTemplate',
      entityId: updated.id,
      summary: `Updated test case template "${updated.name}"`,
    });
    return updated;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    let removed;
    try {
      removed = await this.prisma.testCaseTemplate.delete({ where: { id } });
    } catch (error) {
      this.rethrow(error);
    }
    await this.auditLog.record({
      actorUserId: actor.id,
      action: 'delete',
      entityType: 'TestCaseTemplate',
      entityId: removed.id,
      summary: `Deleted test case template "${removed.name}"`,
    });
  }
}
