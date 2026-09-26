import {
  decryptSecret,
  encryptSecret,
  postWebhook,
  validateWebhookUrl,
  webhookHint,
} from './notification-delivery';
import { describeRoute } from '../audit-log/audit-trail.interceptor';
import {
  DEFECT_STATUS_GROUP,
  OPEN_DEFECT_STATUSES,
  emptyDefectStatusCounts,
  countDefectStatus,
} from '../defects/defect-status';

describe('webhook URL validation', () => {
  it('accepts genuine Slack and Teams webhook hosts', () => {
    expect(() =>
      validateWebhookUrl('SLACK', 'https://hooks.slack.com/services/T0/B0/xyz'),
    ).not.toThrow();
    expect(() =>
      validateWebhookUrl(
        'TEAMS',
        'https://contoso.webhook.office.com/webhookb2/abc',
      ),
    ).not.toThrow();
    expect(() =>
      validateWebhookUrl(
        'TEAMS',
        'https://prod-01.westus.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke',
      ),
    ).not.toThrow();
  });

  it('rejects anything else (no arbitrary server-side requests)', () => {
    expect(() =>
      validateWebhookUrl('SLACK', 'http://hooks.slack.com/services/x'),
    ).toThrow();
    expect(() =>
      validateWebhookUrl('SLACK', 'https://evil.example.com/hooks.slack.com'),
    ).toThrow();
    expect(() =>
      validateWebhookUrl('SLACK', 'https://hooks.slack.com.evil.com/x'),
    ).toThrow();
    expect(() =>
      validateWebhookUrl('TEAMS', 'https://169.254.169.254/latest'),
    ).toThrow();
    expect(() =>
      validateWebhookUrl(
        'TEAMS',
        'https://user:pw@contoso.webhook.office.com/x',
      ),
    ).toThrow();
    expect(() =>
      validateWebhookUrl('TEAMS', 'https://hooks.slack.com/services/x'),
    ).toThrow();
  });

  it('hint never contains the secret path', () => {
    const url = validateWebhookUrl(
      'SLACK',
      'https://hooks.slack.com/services/T0/B0/SECRETTOKEN1234',
    );
    expect(webhookHint(url)).toBe('hooks.slack.com/…1234');
  });
});

describe('secret encryption', () => {
  it('round-trips and does not store plain text', () => {
    const sealed = encryptSecret('https://hooks.slack.com/services/T0/B0/abc');
    expect(sealed).not.toContain('hooks.slack.com');
    expect(decryptSecret(sealed)).toBe(
      'https://hooks.slack.com/services/T0/B0/abc',
    );
  });

  it('refuses tampered data', () => {
    const sealed = encryptSecret('secret');
    const parts = sealed.split('.');
    parts[3] = Buffer.from('other').toString('base64');
    expect(decryptSecret(parts.join('.'))).toBeNull();
  });
});

describe('audit trail route naming', () => {
  it('names CRUD and actions', () => {
    expect(describeRoute('/base/', 'POST')).toEqual({
      action: 'create',
      subject: '',
    });
    expect(describeRoute('/base/:id', 'PATCH')).toEqual({
      action: 'update',
      subject: '',
    });
    expect(describeRoute('/base/:id', 'DELETE')).toEqual({
      action: 'delete',
      subject: '',
    });
    expect(describeRoute('/base/:id/sign-off', 'POST')).toEqual({
      action: 'sign-off',
      subject: '',
    });
    expect(
      describeRoute('/base/:id/test-cases/:testCaseId/executions', 'POST'),
    ).toEqual({
      action: 'create',
      subject: 'test case execution',
    });
    expect(
      describeRoute('/base/:testId/findings/:findingId', 'DELETE'),
    ).toEqual({
      action: 'delete',
      subject: 'finding',
    });
  });
});

describe('defect status taxonomy', () => {
  it('keeps the original meaning of "open" and adds New / Assigned', () => {
    expect(OPEN_DEFECT_STATUSES.sort()).toEqual(
      ['ASSIGNED', 'IN_PROGRESS', 'NEW', 'OPEN', 'REOPENED'].sort(),
    );
  });

  it('groups every status', () => {
    expect(Object.keys(DEFECT_STATUS_GROUP)).toHaveLength(14);
    const counts = emptyDefectStatusCounts();
    for (const s of Object.keys(DEFECT_STATUS_GROUP))
      countDefectStatus(counts, s);
    expect(counts).toEqual({
      open: 3,
      inProgress: 1,
      resolved: 4,
      reopened: 1,
      closed: 4,
      deferred: 1,
    });
  });
});

describe('webhook delivery', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('posts a Slack message and reports success', async () => {
    const calls: { url: string; body: string }[] = [];
    global.fetch = jest.fn((url: string, init: RequestInit) => {
      calls.push({ url, body: init.body as string });
      return Promise.resolve({ ok: true, status: 200 } as Response);
    }) as never;
    const error = await postWebhook(
      'SLACK',
      'https://hooks.slack.com/services/T/B/x',
      {
        title: 'Critical defect',
        message: 'Login fails',
      },
    );
    expect(error).toBeNull();
    expect((JSON.parse(calls[0].body) as { text: string }).text).toContain(
      'Critical defect',
    );
  });

  it('posts a Teams adaptive card and reports HTTP failures', async () => {
    let body = '';
    global.fetch = jest.fn((_url: string, init: RequestInit) => {
      body = init.body as string;
      return Promise.resolve({ ok: false, status: 400 } as Response);
    }) as never;
    const error = await postWebhook(
      'TEAMS',
      'https://contoso.webhook.office.com/webhookb2/x',
      {
        title: 'Overdue',
        message: 'Plan is overdue',
      },
    );
    expect(error).toBe('The webhook answered HTTP 400.');
    expect(
      (JSON.parse(body) as { attachments: { contentType: string }[] })
        .attachments[0].contentType,
    ).toBe('application/vnd.microsoft.card.adaptive');
  });

  it('never calls a disallowed host', async () => {
    const spy = jest.fn();
    global.fetch = spy as never;
    const error = await postWebhook('SLACK', 'https://attacker.example/x', {
      title: 't',
      message: 'm',
    });
    expect(error).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });
});
