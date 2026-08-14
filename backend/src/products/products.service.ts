import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const ORGANIZATION_REF_SELECT = { select: { id: true, name: true } };

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { organization: ORGANIZATION_REF_SELECT },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: dto,
        include: { organization: ORGANIZATION_REF_SELECT },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          `Organization ${dto.organizationId} not found`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        include: { organization: ORGANIZATION_REF_SELECT },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Product ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            `Organization ${dto.organizationId} not found`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: { select: { requirements: true, testPlans: true, testScenarios: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const blockers: string[] = [];
    if (product._count.requirements > 0) {
      blockers.push(`${product._count.requirements} requirement(s)`);
    }
    if (product._count.testPlans > 0) {
      blockers.push(`${product._count.testPlans} test plan(s)`);
    }
    if (product._count.testScenarios > 0) {
      blockers.push(`${product._count.testScenarios} test scenario(s)`);
    }
    if (blockers.length > 0) {
      throw new ConflictException(
        `This product cannot be deleted because it has ${blockers.join(' and ')}.`,
      );
    }

    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This product cannot be deleted because it has dependent records.',
        );
      }
      throw error;
    }
  }
}
