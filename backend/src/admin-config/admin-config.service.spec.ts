import { BadRequestException } from '@nestjs/common';
import {
  assertApprovalComment,
  assertWorkflowTransition,
} from './admin-config.service';
import { defaultApproval, defaultWorkflow } from './admin-config.constants';

function prismaWith(value: unknown) {
  return {
    platformConfiguration: {
      findUnique: jest
        .fn()
        .mockResolvedValue(value === undefined ? null : { value }),
    },
  } as never;
}

describe('workflow enforcement', () => {
  it('default workflow allows every transition and is not enforced', () => {
    const wf = defaultWorkflow('DEFECT');
    expect(wf.enforced).toBe(false);
    expect(wf.transitions).toHaveLength(5 * 4);
  });

  it('is a no-op when nothing is configured', async () => {
    await expect(
      assertWorkflowTransition(
        prismaWith(undefined),
        'DEFECT',
        'OPEN',
        'CLOSED',
      ),
    ).resolves.toBeUndefined();
  });

  it('ignores unchanged or missing status', async () => {
    const prisma = prismaWith({ enforced: true, transitions: [] });
    await expect(
      assertWorkflowTransition(prisma, 'TEST_CASE', 'DRAFT', undefined),
    ).resolves.toBeUndefined();
    await expect(
      assertWorkflowTransition(prisma, 'TEST_CASE', 'DRAFT', 'DRAFT'),
    ).resolves.toBeUndefined();
  });

  it('blocks a transition that an enforced workflow does not allow', async () => {
    const prisma = prismaWith({
      enforced: true,
      transitions: [{ from: 'DRAFT', to: 'READY' }],
    });
    await expect(
      assertWorkflowTransition(prisma, 'TEST_CASE', 'DRAFT', 'READY'),
    ).resolves.toBeUndefined();
    await expect(
      assertWorkflowTransition(prisma, 'TEST_CASE', 'DRAFT', 'APPROVED'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not block anything while the workflow is not enforced', async () => {
    const prisma = prismaWith({ enforced: false, transitions: [] });
    await expect(
      assertWorkflowTransition(prisma, 'DEFECT', 'OPEN', 'CLOSED'),
    ).resolves.toBeUndefined();
  });
});

describe('approval comment rules', () => {
  it('defaults keep the existing behaviour', () => {
    expect(defaultApproval('REQUIREMENT_REVIEW')).toEqual({
      requireCommentOnApprove: false,
      requireCommentOnReject: true,
    });
    expect(defaultApproval('RELEASE_SIGN_OFF')).toEqual({
      requireCommentOnApprove: false,
      requireCommentOnReject: false,
    });
  });

  it('requires a comment only where the policy says so', async () => {
    const prisma = prismaWith({
      requireCommentOnApprove: true,
      requireCommentOnReject: false,
    });
    await expect(
      assertApprovalComment(prisma, 'UAT_SIGN_OFF', 'APPROVED', '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      assertApprovalComment(prisma, 'UAT_SIGN_OFF', 'APPROVED', 'ok'),
    ).resolves.toBeUndefined();
    await expect(
      assertApprovalComment(prisma, 'UAT_SIGN_OFF', 'REJECTED', undefined),
    ).resolves.toBeUndefined();
  });
});

describe('source-aligned workflow coverage', () => {
  it('covers every Requirements section 23 lifecycle', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WORKFLOW_KEYS } = require('./admin-config.constants') as {
      WORKFLOW_KEYS: string[];
    };
    expect(WORKFLOW_KEYS.sort()).toEqual(
      [
        'DEFECT',
        'RELEASE',
        'REQUIREMENT',
        'TEST_CASE',
        'TEST_EXECUTION',
        'TEST_PLAN',
        'TEST_SCENARIO',
        'UAT_CYCLE',
      ].sort(),
    );
  });

  it('new workflows are not enforced by default (no behaviour change)', async () => {
    for (const key of [
      'REQUIREMENT',
      'TEST_PLAN',
      'TEST_SCENARIO',
      'TEST_EXECUTION',
      'UAT_CYCLE',
      'RELEASE',
    ] as const) {
      await expect(
        assertWorkflowTransition(prismaWith(undefined), key, 'X', 'Y'),
      ).resolves.toBeUndefined();
    }
  });
});
