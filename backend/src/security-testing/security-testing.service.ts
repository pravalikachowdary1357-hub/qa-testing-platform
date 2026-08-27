import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import {
  FindingSeverity,
  SecurityTestStatus,
  VulnerabilityStatus,
} from '../../generated/prisma/enums.js';
import { CreateSecurityTestDto } from './dto/create-security-test.dto';
import { UpdateSecurityTestDto } from './dto/update-security-test.dto';
import { CompleteSecurityTestDto } from './dto/complete-security-test.dto';
import { CreateSecurityFindingDto } from './dto/create-security-finding.dto';
import { UpdateSecurityFindingDto } from './dto/update-security-finding.dto';

const PRODUCT_REF = { select: { id: true, name: true } };
const RELEASE_REF = { select: { id: true, name: true, version: true } };
const ENVIRONMENT_REF = { select: { id: true, name: true } };
const TEST_CASE_REF = { select: { id: true, title: true } };

const RELATION_INCLUDE = {
  product: PRODUCT_REF,
  release: RELEASE_REF,
  environment: ENVIRONMENT_REF,
  testCase: TEST_CASE_REF,
};

const LIST_INCLUDE = {
  ...RELATION_INCLUDE,
  _count: { select: { findings: true } },
};

const DETAIL_INCLUDE = {
  ...RELATION_INCLUDE,
  findings: { orderBy: { discoveredAt: 'desc' as const } },
};

const ALL_SEVERITIES: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const ALL_VULN_STATUSES: VulnerabilityStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'REOPENED',
  'ACCEPTED',
];

@Injectable()
export class SecurityTestingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(productId?: string) {
    return this.prisma.securityTest.findMany({
      where: productId ? { productId } : {},
      include: LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async summary(productId?: string) {
    const where = productId ? { securityTest: { productId } } : {};
    const [bySeverityRaw, byStatusRaw] = await Promise.all([
      this.prisma.securityFinding.groupBy({ where, by: ['severity'], _count: { _all: true } }),
      this.prisma.securityFinding.groupBy({ where, by: ['status'], _count: { _all: true } }),
    ]);

    const bySeverity = Object.fromEntries(ALL_SEVERITIES.map((s) => [s, 0])) as Record<
      FindingSeverity,
      number
    >;
    bySeverityRaw.forEach((row) => {
      bySeverity[row.severity] = row._count._all;
    });

    const byStatus = Object.fromEntries(ALL_VULN_STATUSES.map((s) => [s, 0])) as Record<
      VulnerabilityStatus,
      number
    >;
    byStatusRaw.forEach((row) => {
      byStatus[row.status] = row._count._all;
    });

    return { bySeverity, byStatus };
  }

  async findOne(id: string) {
    const test = await this.prisma.securityTest.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!test) {
      throw new NotFoundException(`Security test ${id} not found`);
    }

    return test;
  }

  async create(dto: CreateSecurityTestDto) {
    await this.validateRelationships(dto.productId, dto.environmentId, dto.testCaseId);

    try {
      return await this.prisma.securityTest.create({
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          environmentId: dto.environmentId,
          testCaseId: dto.testCaseId,
          name: dto.name,
          description: dto.description,
          target: dto.target,
          testType: dto.testType,
          configuration: dto.configuration,
        },
        include: LIST_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Product, environment, or test case reference not found');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSecurityTestDto) {
    const existing = await this.prisma.securityTest.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Security test ${id} not found`);
    }

    const effectiveProductId = dto.productId ?? existing.productId;
    const effectiveEnvironmentId =
      dto.environmentId !== undefined ? dto.environmentId : existing.environmentId;
    const effectiveTestCaseId = dto.testCaseId !== undefined ? dto.testCaseId : existing.testCaseId;

    await this.validateRelationships(effectiveProductId, effectiveEnvironmentId, effectiveTestCaseId);

    try {
      return await this.prisma.securityTest.update({
        where: { id },
        data: {
          productId: dto.productId,
          releaseId: dto.releaseId,
          environmentId: dto.environmentId,
          testCaseId: dto.testCaseId,
          name: dto.name,
          description: dto.description,
          target: dto.target,
          testType: dto.testType,
          configuration: dto.configuration,
        },
        include: LIST_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Security test ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Product, environment, or test case reference not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.securityTest.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Security test ${id} not found`);
      }
      throw error;
    }
  }

  // Marks the test as actively being worked (by a human tester or an
  // external tool run outside this app -- this deliberately performs no
  // network activity of its own; see complete() for why).
  async execute(id: string) {
    const existing = await this.prisma.securityTest.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Security test ${id} not found`);
    }

    if (existing.status === SecurityTestStatus.RUNNING) {
      throw new ConflictException('This security test is already running.');
    }

    return this.prisma.securityTest.update({
      where: { id },
      data: {
        status: SecurityTestStatus.RUNNING,
        lastExecutedAt: new Date(),
        lastRunNotes: null,
      },
      include: LIST_INCLUDE,
    });
  }

  // Records the real outcome of a security test. This app has no automated
  // scanning/attack engine (by design -- see the module's scope), so the
  // actual PASS/FAIL verdict can only come from a human recording what an
  // external tool or manual review found, never something this endpoint
  // invents on its own.
  async complete(id: string, dto: CompleteSecurityTestDto) {
    const existing = await this.prisma.securityTest.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Security test ${id} not found`);
    }

    if (existing.status !== SecurityTestStatus.RUNNING) {
      throw new BadRequestException(
        'Only a running security test can be completed. Call execute first.',
      );
    }

    return this.prisma.securityTest.update({
      where: { id },
      data: { status: dto.status, lastRunNotes: dto.notes },
      include: LIST_INCLUDE,
    });
  }

  async addFinding(testId: string, dto: CreateSecurityFindingDto) {
    const test = await this.prisma.securityTest.findUnique({ where: { id: testId } });

    if (!test) {
      throw new NotFoundException(`Security test ${testId} not found`);
    }

    return this.prisma.securityFinding.create({
      data: {
        securityTestId: testId,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        evidence: dto.evidence,
        recommendation: dto.recommendation,
        status: dto.status,
      },
    });
  }

  async updateFinding(testId: string, findingId: string, dto: UpdateSecurityFindingDto) {
    const finding = await this.findFindingOrThrow(testId, findingId);

    return this.prisma.securityFinding.update({
      where: { id: finding.id },
      data: {
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        evidence: dto.evidence,
        recommendation: dto.recommendation,
        status: dto.status,
      },
    });
  }

  async removeFinding(testId: string, findingId: string) {
    const finding = await this.findFindingOrThrow(testId, findingId);
    await this.prisma.securityFinding.delete({ where: { id: finding.id } });
  }

  private async findFindingOrThrow(testId: string, findingId: string) {
    const finding = await this.prisma.securityFinding.findUnique({ where: { id: findingId } });

    if (!finding || finding.securityTestId !== testId) {
      throw new NotFoundException(`Finding ${findingId} not found on security test ${testId}`);
    }

    return finding;
  }

  private async validateRelationships(
    productId: string,
    environmentId?: string | null,
    testCaseId?: string | null,
  ) {
    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
        select: { id: true, productId: true },
      });
      if (!environment) {
        throw new BadRequestException(`Environment ${environmentId} not found`);
      }
      if (environment.productId !== productId) {
        throw new BadRequestException(
          `Environment ${environmentId} does not belong to the selected product.`,
        );
      }
    }

    if (testCaseId) {
      const testCase = await this.prisma.testCase.findUnique({
        where: { id: testCaseId },
        select: { id: true, testScenario: { select: { productId: true } } },
      });
      if (!testCase) {
        throw new BadRequestException(`Test case ${testCaseId} not found`);
      }
      if (testCase.testScenario.productId !== productId) {
        throw new BadRequestException(
          `Test case ${testCaseId} does not belong to the selected product.`,
        );
      }
    }
  }
}
