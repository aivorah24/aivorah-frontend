import { computeStudentStatus, resolveStudentStatus, childStudentStatus } from '../studentStatus';

const NOW = new Date('2026-10-12T12:00:00Z').getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

describe('computeStudentStatus', () => {
  test('day-1 student who just logged in is Getting Started, not Needs Attention', () => {
    expect(computeStudentStatus({ lastActive: daysAgo(0), createdAt: daysAgo(0), progressPct: 0 }, NOW)).toBe('getting_started');
  });

  test('never-logged-in account flips to Needs Attention exactly at 7 days', () => {
    expect(computeStudentStatus({ lastActive: null, createdAt: daysAgo(6) }, NOW)).toBe('getting_started');
    expect(computeStudentStatus({ lastActive: null, createdAt: daysAgo(7) }, NOW)).toBe('needs_attention');
  });

  test('7+ days inactive is Needs Attention regardless of progress', () => {
    expect(computeStudentStatus({ lastActive: daysAgo(7), createdAt: daysAgo(60), progressPct: 90 }, NOW)).toBe('needs_attention');
  });

  test('established active students are tagged by progress', () => {
    const base = { lastActive: daysAgo(1), createdAt: daysAgo(30) };
    expect(computeStudentStatus({ ...base, progressPct: 50 }, NOW)).toBe('excelling');
    expect(computeStudentStatus({ ...base, progressPct: 20 }, NOW)).toBe('on_track');
    expect(computeStudentStatus({ ...base, progressPct: 19 }, NOW)).toBe('keep_going');
  });
});

describe('resolveStudentStatus', () => {
  test('prefers a valid server status, ignores unknown ones', () => {
    expect(resolveStudentStatus({ status: 'excelling', lastActive: null, createdAt: '2020-01-01' })).toBe('excelling');
    expect(resolveStudentStatus({ status: 'bogus', lastActive: null, createdAt: '2020-01-01' })).toBe('needs_attention');
  });
});

describe('childStudentStatus', () => {
  test('uses addedAt as account age and derives progress from topics', () => {
    const recent = new Date().toISOString();
    expect(childStudentStatus({ lastActive: recent, addedAt: recent, completedTopics: [], totalTopics: 10 })).toBe('getting_started');
    expect(childStudentStatus({ lastActive: recent, addedAt: '2020-01-01', completedTopics: ['a', 'b', 'c', 'd', 'e'], totalTopics: 10 })).toBe('excelling');
  });
});
