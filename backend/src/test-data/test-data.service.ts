import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateTestDataDto } from './dto/create-test-data.dto';
import { UpdateTestDataDto } from './dto/update-test-data.dto';

const TEST_CASE_REF = { select: { id: true, title: true } };

// The `value` column can hold sensitive-looking content (credentials, tokens),
// so the list endpoint deliberately omits it -- only the single-record detail
// endpoint (findOne) returns it.
const LIST_SELECT = {
  id: true,
  testCaseId: true,
  name: true,
  description: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  testCase: TEST_CASE_REF,
};

@Injectable()
export class TestDataService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId?: string) {
    return this.prisma.testData.findMany({
      where: productId ? { testCase: { testScenario: { productId } } } : {},
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.testData.findUnique({
      where: { id },
      include: { testCase: TEST_CASE_REF },
    });

    if (!record) {
      throw new NotFoundException(`Test data ${id} not found`);
    }

    return record;
  }

  async create(dto: CreateTestDataDto) {
    try {
      return await this.prisma.testData.create({
        data: dto,
        include: { testCase: TEST_CASE_REF },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Test case ${dto.testCaseId} not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTestDataDto) {
    try {
      return await this.prisma.testData.update({
        where: { id },
        data: dto,
        include: { testCase: TEST_CASE_REF },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Test data ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(`Test case ${dto.testCaseId} not found`);
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.testData.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Test data ${id} not found`);
      }
      throw error;
    }
  }
}
