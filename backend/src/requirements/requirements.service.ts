import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

const PRODUCT_REF_SELECT = { select: { id: true, name: true } };

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.requirement.findMany({
      include: { product: PRODUCT_REF_SELECT },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      include: { product: PRODUCT_REF_SELECT },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }

    return requirement;
  }

  async create(dto: CreateRequirementDto) {
    try {
      return await this.prisma.requirement.create({
        data: dto,
        include: { product: PRODUCT_REF_SELECT },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(`Product ${dto.productId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateRequirementDto) {
    try {
      return await this.prisma.requirement.update({
        where: { id },
        data: dto,
        include: { product: PRODUCT_REF_SELECT },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Requirement ${id} not found`);
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
      await this.prisma.requirement.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Requirement ${id} not found`);
      }
      throw error;
    }
  }
}
