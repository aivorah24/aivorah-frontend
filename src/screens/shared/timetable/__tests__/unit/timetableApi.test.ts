import { fetchClasses, fetchTimetable, saveTemplate, saveSlot, fmtTime, DAY_LABELS, subjectColor, SUBJECT_PALETTE } from '../../services/timetableApi';
import { trRequest } from '../../../../../services/timetableResourcesClient';

jest.mock('../../../../../services/timetableResourcesClient', () => ({ trRequest: jest.fn() }));
const mockRequest = trRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({});
});

describe('timetable requests (no email or school sent; the server uses the sign-in)', () => {
  test('fetchClasses', async () => {
    await fetchClasses();
    expect(mockRequest).toHaveBeenCalledWith('/timetable/classes', {}, 'Failed to load classes');
  });

  test('fetchTimetable builds the class query', async () => {
    await fetchTimetable('Grade 4', 'A');
    expect(mockRequest).toHaveBeenCalledWith('/timetable?grade=Grade+4&section=A', {}, 'Failed to load timetable');
  });

  test('fetchTimetable with no section', async () => {
    await fetchTimetable('Grade 4', '');
    expect(mockRequest.mock.calls[0][0]).toBe('/timetable?grade=Grade+4&section=');
  });

  test('saveTemplate PUTs the periods', async () => {
    const body = { grade: 'Grade 4', section: 'A', periodDefs: [{ code: 'P1', start: '08:00', end: '08:50', isBreak: false }] };
    await saveTemplate(body);
    expect(mockRequest).toHaveBeenCalledWith('/timetable/template', { method: 'PUT', body }, 'Failed to save the bell schedule');
  });

  test('saveSlot PUTs the slot', async () => {
    const body = { grade: 'Grade 4', section: 'A', day: 'MON', periodCode: 'P1', subject: 'Maths' };
    await saveSlot(body);
    expect(mockRequest).toHaveBeenCalledWith('/timetable/slot', { method: 'PUT', body }, 'Failed to save the slot');
  });

  test('errors from the client reach the caller', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Not allowed to view this timetable'));
    await expect(fetchTimetable('Grade 6', 'A')).rejects.toThrow('Not allowed to view this timetable');
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
