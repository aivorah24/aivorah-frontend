jest.mock('../../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../../config/learningPathsServerUrl', () => 'https://server.test');

import { auth } from '../../../../../../config/firebase';
import { listTeacherLearningPaths, getTeacherLearningPath } from '../../services/studentLearningPathService';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.clearAllMocks(); });

function jsonResponse(body: any, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

describe('studentLearningPathService', () => {
  test('listTeacherLearningPaths requests the list endpoint with auth', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ learningPaths: [{ id: 'lp1' }] })) as any;
    const result = await listTeacherLearningPaths();
    expect(global.fetch).toHaveBeenCalledWith('https://server.test/student/learning-paths', {
      headers: { Authorization: 'Bearer real-id-token' },
    });
    expect(result.learningPaths).toEqual([{ id: 'lp1' }]);
  });

  test('getTeacherLearningPath requests the given curriculum id', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ learningPath: { id: 'lp1' } })) as any;
    const result = await getTeacherLearningPath('c1');
    expect(global.fetch).toHaveBeenCalledWith('https://server.test/student/learning-paths/c1', expect.any(Object));
    expect(result.learningPath.id).toBe('lp1');
  });

  test('throws a StudentLearningPathApiError carrying the HTTP status on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Not authorized for this learning path' }, false, 403)) as any;
    await expect(getTeacherLearningPath('c1')).rejects.toMatchObject({ status: 403, message: 'Not authorized for this learning path' });
  });

  test('rejects with a clear message when there is no signed-in user', async () => {
    (auth as any).currentUser = null;
    await expect(getTeacherLearningPath('c1')).rejects.toThrow('Not signed in.');
  });
});
