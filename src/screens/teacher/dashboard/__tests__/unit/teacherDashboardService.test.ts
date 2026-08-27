import {
  fetchTeacherStudents, fetchTeacherInsights, fetchTeacherRecentActivity,
} from '../../services/teacherDashboardService';

function jsonRes(data: any) {
  return Promise.resolve({ json: async () => data });
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(jsonRes([]));
});

describe('fetchTeacherStudents', () => {
  test('calls /student/by-teacher/:email with the URL-encoded email and returns the parsed JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([{ id: 's1' }]));
    const result = await fetchTeacherStudents('teacher+a@aivorah.test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/student/by-teacher/teacher%2Ba%40aivorah.test'),
    );
    expect(result).toEqual([{ id: 's1' }]);
  });
});

describe('fetchTeacherInsights', () => {
  test('calls /student/by-teacher/:email/insights', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ totals: {} }));
    const result = await fetchTeacherInsights('teacher@aivorah.test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/student/by-teacher/teacher%40aivorah.test/insights'),
    );
    expect(result).toEqual({ totals: {} });
  });
});

describe('fetchTeacherRecentActivity', () => {
  test('calls /student/recent-activity/by-teacher/:email', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([]));
    await fetchTeacherRecentActivity('teacher@aivorah.test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/student/recent-activity/by-teacher/teacher%40aivorah.test'),
    );
  });
});
