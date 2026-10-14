import { displayStatus } from '../../utils/displayStatus';

const NOW = new Date('2026-10-13T12:00:00Z');
const a = (o: any) => ({ status: 'published', startsAt: null, expiresAt: null, ...o });

describe('displayStatus', () => {
  test.each([
    ['live published', a({}), 'published'],
    ['published past expiry', a({ expiresAt: '2026-09-25T14:00:00Z' }), 'expired'],
    ['published, expires later', a({ expiresAt: '2026-10-20T00:00:00Z' }), 'published'],
    ['published with a future start', a({ startsAt: '2026-10-14T09:00:00Z' }), 'scheduled'],
    ['scheduled whose start has passed', a({ status: 'scheduled', startsAt: '2026-10-13T09:00:00Z' }), 'published'],
    ['scheduled, past expiry', a({ status: 'scheduled', startsAt: '2026-09-01T09:00:00Z', expiresAt: '2026-09-02T09:00:00Z' }), 'expired'],
    ['draft stays draft even if expired', a({ status: 'draft', expiresAt: '2026-09-01T00:00:00Z' }), 'draft'],
    ['archived', a({ status: 'archived' }), 'archived'],
  ])('%s', (_label, item, expected) => {
    expect(displayStatus(item as any, NOW)).toBe(expected);
  });
});
