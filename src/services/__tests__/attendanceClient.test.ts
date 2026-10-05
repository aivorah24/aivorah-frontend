jest.mock('../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok-1') } },
}));

import {
  fetchMyAttendanceClasses, fetchClassAttendance, saveClassAttendance, fetchStudentAttendanceSummary,
} from '../attendanceClient';
import ATTENDANCE_SERVER_URL from '../../config/attendanceServerUrl';

function reply(body: any, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body });
}

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as any;
});

describe('attendanceClient', () => {
  test('every call goes to the attendance service with the signed-in token', async () => {
    fetchMock.mockReturnValue(reply({ classes: [{ grade: 'Grade 5', section: 'A' }] }));
    expect(await fetchMyAttendanceClasses()).toEqual([{ grade: 'Grade 5', section: 'A' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${ATTENDANCE_SERVER_URL}/classes/mine`);
    expect(init.headers.Authorization).toBe('Bearer tok-1');
  });

  test('class roster: grade, section and date are sent as query params', async () => {
    fetchMock.mockReturnValue(reply({ students: [{ id: 's1', name: 'A', status: null }] }));
    const list = await fetchClassAttendance('Grade 5', 'E2E A', '2026-09-15');
    expect(list).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${ATTENDANCE_SERVER_URL}/attendance/class?grade=Grade+5&section=E2E+A&date=2026-09-15`);
  });

  test('save posts JSON with the class, date and marks', async () => {
    fetchMock.mockReturnValue(reply({ success: true, date: '2026-09-15' }));
    await saveClassAttendance({ grade: 'Grade 5', section: 'A', date: '2026-09-15', records: { s1: 'absent' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${ATTENDANCE_SERVER_URL}/attendance/save`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ grade: 'Grade 5', section: 'A', date: '2026-09-15', records: { s1: 'absent' } });
  });

  test("a server error (e.g. 403 for another teacher's class) is thrown with the server's message", async () => {
    fetchMock.mockReturnValue(reply({ error: 'Not your class' }, false, 403));
    await expect(fetchClassAttendance('Grade 5', 'B', '2026-09-15')).rejects.toThrow('Not your class');
  });

  test('summary keeps ratePct null when nothing is marked', async () => {
    fetchMock.mockReturnValue(reply({ summary: { present: 0, absent: 0, late: 0, total: 0, ratePct: null }, history: [] }));
    const s = await fetchStudentAttendanceSummary('c 1');
    expect(s.summary.ratePct).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe(`${ATTENDANCE_SERVER_URL}/attendance/student/c%201/summary`);
  });
});
