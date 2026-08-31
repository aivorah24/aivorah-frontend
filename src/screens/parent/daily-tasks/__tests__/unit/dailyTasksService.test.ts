import * as dailyTasksService from '../../services/dailyTasksService';
import SERVER_URL from '../../../../../config/serverUrl';
import DAILY_HABITS_SERVER_URL from '../../../../../config/dailyHabitsServerUrl';

global.fetch = jest.fn();

describe('dailyTasksService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls the monolith children endpoint and returns the list', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid' }]),
      });

      const res = await dailyTasksService.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid' }]);
    });

    it('throws when the response is not ok', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      await expect(dailyTasksService.fetchChildren('parent@test.com')).rejects.toThrow('Could not load children.');
    });

    it('returns an empty array when the payload is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({}) });
      const res = await dailyTasksService.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('fetchTasks', () => {
    it('calls the daily-habits-service parent-tasks endpoint', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 't1', label: 'Read' }]),
      });

      const res = await dailyTasksService.fetchTasks('c1');
      expect(fetch).toHaveBeenCalledWith(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks?childId=c1`);
      expect(res).toEqual([{ id: 't1', label: 'Read' }]);
    });

    it('throws when the response is not ok', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      await expect(dailyTasksService.fetchTasks('c1')).rejects.toThrow('Could not load tasks.');
    });
  });

  describe('createTask', () => {
    it('POSTs to the daily-habits-service and returns the new task', async () => {
      const payload = { parentEmail: 'p@test.com', childId: 'c1', label: 'Read', icon: 'book-open', coins: 10 };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ id: 't1', ...payload }),
      });

      const res = await dailyTasksService.createTask(payload);
      expect(fetch).toHaveBeenCalledWith(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res).toEqual({ id: 't1', ...payload });
    });

    it('throws the server-provided error message on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'label required' }),
      });

      await expect(
        dailyTasksService.createTask({ parentEmail: 'p@test.com', childId: 'c1', label: '', icon: 'star', coins: 5 })
      ).rejects.toThrow('label required');
    });

    it('falls back to a generic message when the error body is unreadable', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockRejectedValueOnce(new Error('bad json')),
      });

      await expect(
        dailyTasksService.createTask({ parentEmail: 'p@test.com', childId: 'c1', label: 'x', icon: 'star', coins: 5 })
      ).rejects.toThrow('Could not save task.');
    });
  });

  describe('deleteTask', () => {
    it('DELETEs the task by id', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await dailyTasksService.deleteTask('t1');
      expect(fetch).toHaveBeenCalledWith(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks/t1`, { method: 'DELETE' });
    });

    it('throws when the response is not ok', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      await expect(dailyTasksService.deleteTask('t1')).rejects.toThrow('Could not delete task.');
    });
  });
});
