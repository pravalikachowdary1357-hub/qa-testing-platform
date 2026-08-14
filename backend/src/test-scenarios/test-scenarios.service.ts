import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestScenarioDto } from './dto/create-test-scenario.dto';
import { UpdateTestScenarioDto } from './dto/update-test-scenario.dto';

const TEST_SCENARIO_INCLUDE = {
  product: { select: { id: true, name: true } },
  requirement: { select: { id: true, title: true } },
};

@Injectable()
export class TestScenariosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.testScenario.findMany({
      include: TEST_SCENARIO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: TEST_SCENARIO_INCLUDE,
    });

    if (!scenario) {
      throw new NotFoundException(`Test scenario ${id} not found`);
    }

    return scenario;
  }

  async create(dto: CreateTestScenarioDto) {
    if (dto.requirementId) {
      await this.validateRequirementBelongsToProduct(dto.requirementId, dto.productId);
    }

    try {
      return await this.prisma.testScenario.create({
        data: dto,
        include: TEST_SCENARIO_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTestScenarioDto) {
    const existing = await this.prisma.testScenario.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Test scenario ${id} not found`);
    }

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveRequirementId =
      dto.requirementId !== undefined ? dto.requirementId : existing.requirementId;

    if (effectiveRequirementId) {
      await this.validateRequirementBelongsToProduct(effectiveRequirementId, effectiveProductId);
    }

    try {
      return await this.prisma.testScenario.update({
        where: { id },
        data: dto,
        include: TEST_SCENARIO_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test scenario ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id },
      include: { _count: { select: { testCases: true } } },
    });

    if (!scenario) {
      throw new NotFoundException(`Test scenario ${id} not found`);
    }

    if (scenario._count.testCases > 0) {
      throw new ConflictException(
        `This test scenario cannot be deleted because it has ${scenario._count.testCases} test case(s).`,
      );
    }

    try {
      await this.prisma.testScenario.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This test scenario cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }
  }

  private async validateRequirementBelongsToProduct(requirementId: string, productId: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
      select: { id: true, productId: true },
    });

    if (!requirement) {
      throw new BadRequestException(`Requirement ${requirementId} not found`);
    }
    if (requirement.productId !== productId) {
      throw new BadRequestException(
        `Requirement ${requirementId} does not belong to the selected product.`,
      );
    }
  }
}
