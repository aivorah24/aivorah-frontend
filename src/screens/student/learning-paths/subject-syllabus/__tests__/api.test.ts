import { getCuratedSyllabus, fetchPublishedSyllabus } from '../api';

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(jsonRes({ units: [] })) as any;
});

describe('getCuratedSyllabus', () => {
  test('returns the real curated chapters for a real supported curriculum/grade/subject', () => {
    const result = getCuratedSyllabus('CBSE', 'Grade 6', 'English');
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(0);
  });

  test('returns real null for a real unsupported combination', () => {
    expect(getCuratedSyllabus('IB PYP', 'Grade 4', 'Mathematics')).toBeNull();
  });
});

describe('fetchPublishedSyllabus', () => {
  test('returns a real empty array on a real non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({}, false)) as any;

    expect(await fetchPublishedSyllabus('CBSE', 'Grade 6', 'English')).toEqual([]);
  });

  test('keeps real units that have zero topics (flagged pending), not just ones with content', async () => {
    const units = [
      { title: 'Chapter 1', topics: [{ id: 't1', name: 'Topic A' }] },
      { title: 'Chapter 2', topics: [], pending: true },
    ];
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units })) as any;

    const result = await fetchPublishedSyllabus('CBSE', 'Grade 6', 'English');

    expect(result).toEqual(units);
  });

  test('keeps real units even when every single one is pending (no lessons generated for any yet) — a subject like Grade 11 Sociology must still show its real chapter titles, not a generic "being processed" screen', async () => {
    const units = [
      { title: 'Sociology and Society', topics: [], pending: true },
      { title: 'Introducing Sociology', topics: [], pending: true },
    ];
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units })) as any;

    expect(await fetchPublishedSyllabus('CBSE', 'Grade 11', 'Sociology')).toEqual(units);
  });

  test('a real request includes the real curriculum/grade/subject as query params', async () => {
    await fetchPublishedSyllabus('CBSE', 'Grade 6', 'English');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('grade=Grade%206&subject=English&curriculum=CBSE'));
  });
});

describe('fetchPublishedSyllabus — ICSE / Cambridge (no textbook yet)', () => {
  test.each([
    ['ICSE', 'Grade 6'],
    ['ICSE', 'Grade 1'],
    ['Cambridge', 'Grade 3'],
    ['Cambridge', 'Grade 9'],
  ])('%s %s reads the syllabus outline from /curriculum/syllabus', async (curriculum, grade) => {
    await fetchPublishedSyllabus(curriculum, grade, 'English');
    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('/curriculum/syllabus?');
    expect(url).toContain(`curriculum=${curriculum}`);
    expect(url).not.toContain('/teacher/syllabus/current');
  });

  test('CBSE is unchanged (teacher-published syllabus)', async () => {
    await fetchPublishedSyllabus('CBSE', 'Grade 6', 'English');
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('/teacher/syllabus/current?');
  });
});
