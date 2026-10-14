// Unit tests for scheduleService.ts — mocks global.fetch, verifies request
// shape/URL/method and response parsing/error handling. Migrated 2026-08-25:
// schedule calls go to aivorah-schedule-service, the roster lookup goes to
// aivorah-teacher-dashboard-service — both real, deployed microservices, no
// real network calls are made here.
import {
  fetchEventsForDate,
  fetchStudentsByTeacher,
  patchEventTimes,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../../services/scheduleService';
import SCHEDULE_SERVER_URL from '../../../../../config/scheduleServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from '../../../../../config/teacherDashboardServerUrl';

jest.mock('../../../../../services/authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer test-token' })) }));

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('fetchEventsForDate', () => {
  test('builds the URL with date, and includes email when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'e1' }] });
    const result = await fetchEventsForDate('2026-08-25', 'teacher@aivorah.test');
    expect(global.fetch).toHaveBeenCalledWith(
      `${SCHEDULE_SERVER_URL}/schedule/teacher?date=2026-08-25&email=teacher%40aivorah.test`,
      { headers: { Authorization: 'Bearer test-token' } }
    );
    expect(result).toEqual([{ id: 'e1' }]);
  });

  test('omits the email param when no email is passed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });
    await fetchEventsForDate('2026-08-25');
    expect(global.fetch).toHaveBeenCalledWith(`${SCHEDULE_SERVER_URL}/schedule/teacher?date=2026-08-25`, { headers: { Authorization: 'Bearer test-token' } });
  });

  test('a non-ok response resolves to an empty array', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    expect(await fetchEventsForDate('2026-08-25')).toEqual([]);
  });

  test('a network failure resolves to an empty array, not a throw', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await expect(fetchEventsForDate('2026-08-25')).resolves.toEqual([]);
  });
});

describe('fetchStudentsByTeacher', () => {
  test('builds the by-teacher URL with an encoded email', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 's1' }] });
    const result = await fetchStudentsByTeacher('teacher@aivorah.test');
    expect(global.fetch).toHaveBeenCalledWith(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/teacher%40aivorah.test`);
    expect(result).toEqual([{ id: 's1' }]);
  });

  test('a non-ok response resolves to an empty array', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    expect(await fetchStudentsByTeacher('teacher@aivorah.test')).toEqual([]);
  });

  test('a network failure resolves to an empty array, not a throw', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('down'));
    await expect(fetchStudentsByTeacher('teacher@aivorah.test')).resolves.toEqual([]);
  });
});

describe('patchEventTimes', () => {
  test('PATCHes the event id with start/end time JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await patchEventTimes('ev1', '09:00', '10:00');
    expect(global.fetch).toHaveBeenCalledWith(`${SCHEDULE_SERVER_URL}/schedule/ev1`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: '09:00', endTime: '10:00' }),
    });
  });

  test('swallows a network failure without throwing', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('down'));
    await expect(patchEventTimes('ev1', '09:00', '10:00')).resolves.toBeUndefined();
  });
});

describe('createEvent', () => {
  test('POSTs the payload and returns the raw Response', async () => {
    const fakeRes = { ok: true, json: async () => ({ id: 'new1' }) };
    (global.fetch as jest.Mock).mockResolvedValueOnce(fakeRes);
    const payload = { title: 'Test Event' };
    const res = await createEvent(payload);
    expect(global.fetch).toHaveBeenCalledWith(`${SCHEDULE_SERVER_URL}/schedule`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res).toBe(fakeRes);
  });

  test('a rejected fetch propagates (no swallow here, caller handles it)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('down'));
    await expect(createEvent({})).rejects.toThrow('down');
  });
});

describe('updateEvent', () => {
  test('PATCHes the event id with the payload', async () => {
    const fakeRes = { ok: true, json: async () => ({}) };
    (global.fetch as jest.Mock).mockResolvedValueOnce(fakeRes);
    const payload = { title: 'Updated' };
    const res = await updateEvent('ev1', payload);
    expect(global.fetch).toHaveBeenCalledWith(`${SCHEDULE_SERVER_URL}/schedule/ev1`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(res).toBe(fakeRes);
  });
});

describe('deleteEvent', () => {
  test('DELETEs the event id', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await deleteEvent('ev1');
    expect(global.fetch).toHaveBeenCalledWith(`${SCHEDULE_SERVER_URL}/schedule/ev1`, { method: 'DELETE', headers: { Authorization: 'Bearer test-token' } });
  });

  test('swallows a network failure without throwing', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('down'));
    await expect(deleteEvent('ev1')).resolves.toBeUndefined();
  });
});
