import { fetchUpcomingDeadlines } from '../dashboardService';

jest.mock('../../../../../services/authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer test-token' })) }));

test('dashboard upcoming deadlines exclude completed work', async () => {
  global.fetch = jest.fn().mockResolvedValue({ json: async () => [] }) as any;
  await fetchUpcomingDeadlines('s1');
  const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
  expect(url).toContain('/schedule/upcoming?studentId=s1');
  expect(url).toContain('hideCompleted=true');
});
