import { getSubjectSyllabus } from '../../../../data/syllabusRegistry';
import { computeAllBarTopics, computeMasteredTopics } from '../performanceStats';

jest.mock('../../../../data/syllabusRegistry', () => ({
  getSubjectSyllabus: jest.fn(),
}));

const mockGetSubjectSyllabus = getSubjectSyllabus as jest.Mock;

beforeEach(() => {
  mockGetSubjectSyllabus.mockReset();
});

describe('computeAllBarTopics', () => {
  test('a chapter with no curated syllabus entry -> 0%, no data, not mastered', () => {
    mockGetSubjectSyllabus.mockReturnValue([]); // no curated chapters at all
    const subjectChapters = [{ subject: 'Mathematics', chapters: ['Fractions'] }];
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', { topics: {}, avgScore: null }, new Set());

    expect(result).toEqual([
      { label: 'Fractions', fullLabel: 'Fractions', subject: 'Mathematics', pct: 0, hasData: false, mastered: false, inProgress: false },
    ]);
  });

  // B002 fix: a chapter with no score/session data yet, but a topic the
  // student has opened via Learn/Listen (startedTopics), must show as
  // "in progress" rather than indistinguishable from never-touched.
  test('a chapter with a started topic (no score yet) -> inProgress true', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }, { name: 'The Lion and the Mouse' }] },
    ]);
    const perfData = { topics: {}, avgScore: null };
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    const startedTopics = new Set(['A Bottle of Dew']);
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', perfData, new Set(), startedTopics);

    expect(result[0].inProgress).toBe(true);
    expect(result[0].mastered).toBe(false);
  });

  test('a chapter with no started topics and no data -> inProgress false', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }] },
    ]);
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', { topics: {}, avgScore: null }, new Set(), new Set());

    expect(result[0].inProgress).toBe(false);
  });

  test('a mastered chapter is never also flagged inProgress', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }] },
    ]);
    const perfData = { topics: { 'A Bottle of Dew': { avgScore: 90 } }, avgScore: null };
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    const startedTopics = new Set(['A Bottle of Dew']);
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', perfData, new Set(), startedTopics);

    expect(result[0].mastered).toBe(true);
    expect(result[0].inProgress).toBe(false);
  });

  test('backward compatibility: omitting startedTopics entirely defaults to not-in-progress, no crash', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }] },
    ]);
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    expect(() => computeAllBarTopics(subjectChapters, false, 'Grade 6', { topics: {}, avgScore: null }, new Set())).not.toThrow();
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', { topics: {}, avgScore: null }, new Set());
    expect(result[0].inProgress).toBe(false);
  });

  test('a curated chapter with real quiz scores -> attributed pct and hasData true', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }, { name: 'The Lion and the Mouse' }] },
    ]);
    const perfData = {
      topics: {
        'A Bottle of Dew': { avgScore: 80 },
        'The Lion and the Mouse': { avgScore: 60 },
      },
      avgScore: null,
    };
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', perfData, new Set());

    expect(result[0].pct).toBe(70); // (80+60)/2
    expect(result[0].hasData).toBe(true);
  });

  test('a chapter where every topic is completed or scored >=80 -> mastered', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }, { name: 'The Lion and the Mouse' }] },
    ]);
    const perfData = { topics: { 'A Bottle of Dew': { avgScore: 90 } }, avgScore: null };
    const completedSet = new Set(['The Lion and the Mouse']);
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', perfData, completedSet);

    expect(result[0].mastered).toBe(true);
  });

  test('session activity but no quiz score -> hasData true, pct 0', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Fables and Folk Tales', topics: [{ name: 'A Bottle of Dew' }] },
    ]);
    const perfData = { topics: { 'A Bottle of Dew': { avgScore: null, sessions: 2 } }, avgScore: null };
    const subjectChapters = [{ subject: 'English', chapters: ['Fables and Folk Tales'] }];
    const result = computeAllBarTopics(subjectChapters, false, 'Grade 6', perfData, new Set());

    expect(result[0].hasData).toBe(true);
    expect(result[0].pct).toBe(0);
  });

  test('IB PYP curriculum flag is passed through to the syllabus lookup', () => {
    mockGetSubjectSyllabus.mockReturnValue([]);
    computeAllBarTopics([{ subject: 'Math', chapters: ['Unit 1'] }], true, 'Grade 4', { topics: {}, avgScore: null }, new Set());
    expect(mockGetSubjectSyllabus).toHaveBeenCalledWith('IB PYP', 'Grade 4', 'Math');
  });
});

describe('computeMasteredTopics', () => {
  test('a subject with no chapters yet is skipped entirely', () => {
    mockGetSubjectSyllabus.mockReturnValue([]);
    const subjectChapters = [{ subject: 'Math', chapters: [] }];
    expect(computeMasteredTopics(subjectChapters, false, 'Grade 6', { topics: {}, avgScore: null }, new Set(['Fractions']))).toBe(0);
  });

  // B004 FIX: the dashboard's headline "Mastered X/Y" count and the
  // per-chapter `mastered` flag (computeAllBarTopics) must agree, since both
  // claim to answer the same question for the same data. computeMasteredTopics
  // now derives from computeAllBarTopics itself (the single authoritative
  // per-chapter rule: every topic completed or avgScore>=80) instead of a
  // separate proportional estimate, so they can no longer diverge. Here
  // exactly one of two chapters is genuinely mastered by the authoritative
  // rule, and the aggregate count must match it exactly.
  test('aggregate mastered count must match the number of chapters computeAllBarTopics marks mastered', () => {
    mockGetSubjectSyllabus.mockReturnValue([
      { title: 'Unit 1', topics: [{ name: 'Fractions' }, { name: 'Decimals' }] },
      { title: 'Unit 2', topics: [{ name: 'Algebra' }] },
    ]);
    const perfData = {
      topics: {
        Fractions: { avgScore: 90 },
        Decimals: { avgScore: 85 },
        // Algebra: not attempted -> avgScore 0, not mastered.
      },
      avgScore: null,
    };
    const completedSet = new Set<string>(); // nothing in completedSet; mastery via avgScore only
    const subjectChapters = [{ subject: 'Math', chapters: ['Unit 1', 'Unit 2'] }];

    const barTopics = computeAllBarTopics(subjectChapters, false, 'Grade 6', perfData, completedSet);
    const authoritativeMasteredCount = barTopics.filter(b => b.mastered).length; // Unit 1 only -> 1

    const aggregateMasteredCount = computeMasteredTopics(subjectChapters, false, 'Grade 6', perfData, completedSet);

    expect(aggregateMasteredCount).toBe(authoritativeMasteredCount);
    expect(aggregateMasteredCount).toBe(1);
  });
});
