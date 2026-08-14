import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const organizations = await this.prisma.organization.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return organizations.map((organization) => this.toListItem(organization));
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        products: true,
        _count: { select: { products: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return {
      ...this.toListItem(organization),
      products: organization.products,
    };
  }

  async create(dto: CreateOrganizationDto) {
    try {
      return await this.prisma.organization.create({ data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `An organization named "${dto.name}" already exists.`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    try {
      return await this.prisma.organization.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Organization ${id} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `An organization named "${dto.name}" already exists.`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    if (organization._count.products > 0) {
      throw new ConflictException(
        'This organization cannot be deleted because it has products.',
      );
    }

    try {
      await this.prisma.organization.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2025' || error.code === 'P2003')
      ) {
        throw new ConflictException(
          'This organization cannot be deleted because it has products.',
        );
      }
      throw error;
    }
  }

  private toListItem(organization: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    _count: { products: number };
  }) {
    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      status: organization.status,
      productCount: organization._count.products,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
