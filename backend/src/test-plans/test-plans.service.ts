import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';

const TEST_PLAN_INCLUDE = {
  product: { select: { id: true, name: true } },
  requirements: { select: { id: true, title: true, status: true } },
};

// DTOs accept plain date strings (e.g. "2026-09-01"), but Prisma 7's
// query engine requires a full ISO-8601 DateTime for DateTime columns.
function toDate(value?: string): Date | undefined {
  return value === undefined ? undefined : new Date(value);
}

@Injectable()
export class TestPlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.testPlan.findMany({
      include: TEST_PLAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const testPlan = await this.prisma.testPlan.findUnique({
      where: { id },
      include: TEST_PLAN_INCLUDE,
    });

    if (!testPlan) {
      throw new NotFoundException(`Test plan ${id} not found`);
    }

    return testPlan;
  }

  async create(dto: CreateTestPlanDto) {
    this.validateDateRange(dto.startDate, dto.endDate);

    const requirementIds = dto.requirementIds ?? [];
    if (requirementIds.length > 0) {
      await this.validateRequirementsBelongToProduct(requirementIds, dto.productId);
    }

    try {
      return await this.prisma.testPlan.create({
        data: {
          productId: dto.productId,
          name: dto.name,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          owner: dto.owner,
          startDate: toDate(dto.startDate),
          endDate: toDate(dto.endDate),
          requirements:
            requirementIds.length > 0
              ? { connect: requirementIds.map((id) => ({ id })) }
              : undefined,
        },
        include: TEST_PLAN_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTestPlanDto) {
    const existing = await this.prisma.testPlan.findUnique({
      where: { id },
      include: { requirements: { select: { id: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Test plan ${id} not found`);
    }

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveStartDate =
      dto.startDate !== undefined ? dto.startDate : (existing.startDate ?? undefined);
    const effectiveEndDate =
      dto.endDate !== undefined ? dto.endDate : (existing.endDate ?? undefined);
    this.validateDateRange(effectiveStartDate, effectiveEndDate);

    // If the product is changing but the caller didn't also resend the
    // requirement list, re-check the plan's existing requirements against
    // the new product so a product change can't silently leave requirements
    // attached that no longer belong to it.
    const effectiveRequirementIds =
      dto.requirementIds ?? (dto.productId ? existing.requirements.map((r) => r.id) : undefined);

    if (effectiveRequirementIds && effectiveRequirementIds.length > 0) {
      await this.validateRequirementsBelongToProduct(effectiveRequirementIds, effectiveProductId);
    }

    try {
      return await this.prisma.testPlan.update({
        where: { id },
        data: {
          productId: dto.productId,
          name: dto.name,
          description: dto.description,
          status: dto.status,
          priority: dto.priority,
          owner: dto.owner,
          startDate: toDate(dto.startDate),
          endDate: toDate(dto.endDate),
          requirements:
            dto.requirementIds !== undefined
              ? { set: dto.requirementIds.map((requirementId) => ({ id: requirementId })) }
              : undefined,
        },
        include: TEST_PLAN_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test plan ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.testPlan.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Test plan ${id} not found`);
      }
      throw error;
    }
  }

  private validateDateRange(startDate?: string | Date, endDate?: string | Date) {
    if (!startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('Start date must be on or before end date.');
    }
  }

  private async validateRequirementsBelongToProduct(requirementIds: string[], productId: string) {
    const requirements = await this.prisma.requirement.findMany({
      where: { id: { in: requirementIds } },
      select: { id: true, productId: true },
    });

    const foundIds = new Set(requirements.map((r) => r.id));
    const missingIds = requirementIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(`Requirement(s) not found: ${missingIds.join(', ')}`);
    }

    const mismatched = requirements.filter((r) => r.productId !== productId);
    if (mismatched.length > 0) {
      throw new BadRequestException(
        `Requirement(s) ${mismatched.map((r) => r.id).join(', ')} do not belong to the selected product.`,
      );
    }
  }
}
