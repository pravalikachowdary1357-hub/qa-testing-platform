import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

const ENVIRONMENT_INCLUDE = {
  product: { select: { id: true, name: true } },
};

@Injectable()
export class EnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.environment.findMany({
      include: ENVIRONMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
      include: ENVIRONMENT_INCLUDE,
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${id} not found`);
    }

    return environment;
  }

  async create(dto: CreateEnvironmentDto) {
    try {
      return await this.prisma.environment.create({
        data: dto,
        include: ENVIRONMENT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `An environment named "${dto.name}" already exists for this product.`,
          );
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateEnvironmentDto) {
    try {
      return await this.prisma.environment.update({
        where: { id },
        data: dto,
        include: ENVIRONMENT_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Environment ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Product ${dto.productId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `An environment named "${dto.name}" already exists for this product.`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
      include: { _count: { select: { testExecutions: true } } },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${id} not found`);
    }

    if (environment._count.testExecutions > 0) {
      throw new ConflictException(
        `This environment cannot be deleted because it has ${environment._count.testExecutions} test execution(s).`,
      );
    }

    try {
      await this.prisma.environment.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This environment cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }
  }
}
