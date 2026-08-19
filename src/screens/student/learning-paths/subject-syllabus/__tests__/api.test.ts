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

  test('returns a real empty array when the server sends units but none have any real topics at all', async () => {
    const units = [{ title: 'Chapter 1', topics: [] }, { title: 'Chapter 2', topics: [] }];
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units })) as any;

    expect(await fetchPublishedSyllabus('CBSE', 'Grade 6', 'English')).toEqual([]);
  });

  test('a real request includes the real curriculum/grade/subject as query params', async () => {
    await fetchPublishedSyllabus('CBSE', 'Grade 6', 'English');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('grade=Grade%206&subject=English&curriculum=CBSE'));
  });
});
