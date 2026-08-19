jest.mock('../../../../data/syllabusRegistry', () => ({
  getSubjectSyllabus: jest.fn(),
}));

import { getSubjectSyllabus } from '../../../../data/syllabusRegistry';
import { computeAllBarTopics, computeMasteredTopics } from '../performanceStats';

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
      { label: 'Fractions', fullLabel: 'Fractions', subject: 'Mathematics', pct: 0, hasData: false, mastered: false },
    ]);
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
  test('no curriculum -> 0', () => {
    expect(computeMasteredTopics([{ subject: 'Math', chapters: ['Unit 1'] }], null, new Set())).toBe(0);
  });

  test('estimates mastered chapters as (completed/total topics) x chapter count, per subject', () => {
    const curriculum = {
      topics: [
        { topic: 'Fractions', subject: 'Math' },
        { topic: 'Decimals', subject: 'Math' },
        { topic: 'Algebra', subject: 'Math' },
        { topic: 'Grammar', subject: 'English' },
      ],
    };
    const subjectChapters = [
      { subject: 'Math', chapters: ['U1', 'U2', 'U3'] }, // 3 chapters
      { subject: 'English', chapters: ['U1'] },
    ];
    // 2 of 3 Math topics completed -> floor(2/3 * 3) = 2. English: 0 of 1 completed -> 0.
    const completedSet = new Set(['Fractions', 'Decimals']);
    expect(computeMasteredTopics(subjectChapters, curriculum, completedSet)).toBe(2);
  });

  test('a subject with no chapters yet is skipped entirely', () => {
    const curriculum = { topics: [{ topic: 'Fractions', subject: 'Math' }] };
    const subjectChapters = [{ subject: 'Math', chapters: [] }];
    expect(computeMasteredTopics(subjectChapters, curriculum, new Set(['Fractions']))).toBe(0);
  });

  test('a subject with no matching curriculum topics is skipped', () => {
    const curriculum = { topics: [{ topic: 'Fractions', subject: 'Math' }] };
    const subjectChapters = [{ subject: 'Science', chapters: ['U1'] }];
    expect(computeMasteredTopics(subjectChapters, curriculum, new Set())).toBe(0);
  });
});
