import { fetchTimetable, saveTemplate, saveSlot, fmtTime, DAY_LABELS, subjectColor, SUBJECT_PALETTE } from '../timetableApi';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchTimetable', () => {
  test('builds the query string and returns the parsed timetable on success', async () => {
    const payload = { grade: 'Grade 4', section: 'A', title: '', periodDefs: [], days: [], slots: [], permissions: { canManageTemplate: true, canEditSlot: true } };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload }) as any;

    const result = await fetchTimetable('admin@x.com', 'school1', 'Grade 4', 'A');

    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/timetable?'));
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('email=admin%40x.com');
    expect(url).toContain('schoolId=school1');
    expect(url).toContain('grade=Grade+4');
    expect(url).toContain('section=A');
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No timetable found' }) }) as any;
    await expect(fetchTimetable('admin@x.com', 'school1', 'Grade 4', 'A')).rejects.toThrow('No timetable found');
  });

  test('a non-ok response with no parseable body falls back to a generic message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error('bad json'); } }) as any;
    await expect(fetchTimetable('admin@x.com', 'school1', 'Grade 4', 'A')).rejects.toThrow('Failed to load timetable');
  });

  test('an empty section still resolves', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    await fetchTimetable('admin@x.com', 'school1', 'Grade 4', '');
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('section=');
  });
});

describe('saveTemplate', () => {
  test('PUTs the body and resolves on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    const body = { email: 'a@x.com', schoolId: 's1', grade: 'Grade 4', section: 'A', periodDefs: [] };

    await expect(saveTemplate(body)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/timetable/template'),
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    );
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Bad periods' }) }) as any;
    await expect(saveTemplate({ email: 'a@x.com', schoolId: 's1', grade: 'Grade 4', section: 'A', periodDefs: [] })).rejects.toThrow('Bad periods');
  });

  test('a non-ok response with no parseable body falls back to a generic message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error('bad json'); } }) as any;
    await expect(saveTemplate({ email: 'a@x.com', schoolId: 's1', grade: 'Grade 4', section: 'A', periodDefs: [] })).rejects.toThrow('Failed to save the bell schedule');
  });
});

describe('saveSlot', () => {
  test('PUTs the body and resolves on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    const body = { email: 'a@x.com', schoolId: 's1', grade: 'Grade 4', section: 'A', day: 'MON', periodCode: 'P1', subject: 'Math' };

    await expect(saveSlot(body)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/timetable/slot'),
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    );
  });

  test('a non-ok response throws the server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Slot conflict' }) }) as any;
    await expect(saveSlot({ email: 'a@x.com', schoolId: 's1', grade: 'Grade 4', section: 'A', day: 'MON', periodCode: 'P1' })).rejects.toThrow('Slot conflict');
  });
});

describe('fmtTime', () => {
  test('formats a morning time', () => {
    expect(fmtTime('08:25')).toBe('8:25 am');
  });

  test('formats an afternoon time', () => {
    expect(fmtTime('13:40')).toBe('1:40 pm');
  });

  test('formats noon as 12 pm', () => {
    expect(fmtTime('12:00')).toBe('12:00 pm');
  });

  test('formats midnight as 12 am', () => {
    expect(fmtTime('00:00')).toBe('12:00 am');
  });

  test('an empty or malformed string returns as-is / empty', () => {
    expect(fmtTime('')).toBe('');
    expect(fmtTime('not-a-time')).toBe('not-a-time');
  });
});

describe('DAY_LABELS', () => {
  test('maps every weekday code to a short label', () => {
    expect(DAY_LABELS).toEqual({ MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' });
  });
});

describe('subjectColor', () => {
  test('a null/empty subject is transparent', () => {
    expect(subjectColor(null)).toBe('transparent');
    expect(subjectColor('')).toBe('transparent');
  });

  test('the same subject always returns the same color (deterministic)', () => {
    expect(subjectColor('Mathematics')).toBe(subjectColor('Mathematics'));
  });

  test('the returned color is always from the defined palette', () => {
    expect(SUBJECT_PALETTE).toContain(subjectColor('Science'));
    expect(SUBJECT_PALETTE).toContain(subjectColor('English'));
  });
});
