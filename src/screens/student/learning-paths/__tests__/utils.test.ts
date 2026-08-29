import { subjectMeta, buildSubjectsFromTopicBank, getIBPYPStaticSubjects } from '../utils';
import { SUBJECT_META, IB_PYP_SUBJECTS_BY_GRADE } from '../constants';
import type { CurriculumTopic } from '../types';

describe('subjectMeta', () => {
  test('a known subject returns its real mapped styling', () => {
    const knownSubject = Object.keys(SUBJECT_META)[0];
    expect(subjectMeta(knownSubject)).toEqual(SUBJECT_META[knownSubject]);
  });

  test('an unmapped subject falls back to the same gold palette every mapped subject uses, not a crash', () => {
    const result = subjectMeta('Some Brand New Subject');
    expect(result).toEqual({
      icon: 'book',
      accentDark: '#C9A24E', bgFromDark: '#E4D4A8', bgToDark: '#F0E2BC',
      accentLight: '#C9A24E', bgFromLight: '#E4D4A8', bgToLight: '#F0E2BC',
    });
  });

  test('every mapped subject uses the exact same accent/gradient colors as the unmapped fallback — a uniform gold grid, not per-subject colors', () => {
    for (const meta of Object.values(SUBJECT_META)) {
      expect(meta.accentDark).toBe('#C9A24E');
      expect(meta.bgFromDark).toBe('#E4D4A8');
      expect(meta.bgToDark).toBe('#F0E2BC');
      expect(meta.accentLight).toBe('#C9A24E');
      expect(meta.bgFromLight).toBe('#E4D4A8');
      expect(meta.bgToLight).toBe('#F0E2BC');
    }
  });
});

describe('buildSubjectsFromTopicBank', () => {
  const topics: CurriculumTopic[] = [
    { grade: 'Grade 3', subject: 'Mathematics', unit: 'Numbers', topic: 'Addition' },
    { grade: 'Grade 3', subject: 'Mathematics', unit: 'Numbers', topic: 'Subtraction' },
    { grade: 'Grade 3', subject: 'Science', unit: 'Living Things', topic: 'Plants' },
  ];

  test('groups topics by subject', () => {
    const result = buildSubjectsFromTopicBank(topics);
    const subjects = result.map(s => s.subject).sort();
    expect(subjects).toEqual(['Mathematics', 'Science']);
  });

  test('topicCount reflects the real number of topics in that subject', () => {
    const result = buildSubjectsFromTopicBank(topics);
    const math = result.find(s => s.subject === 'Mathematics');
    expect(math?.topicCount).toBe(2);
  });

  test('each topic gets an auto-generated description', () => {
    const result = buildSubjectsFromTopicBank(topics);
    const math = result.find(s => s.subject === 'Mathematics');
    expect(math?.topics[0].description).toBe('Learn about Addition in Numbers');
  });

  test('empty topic list -> empty subject list', () => {
    expect(buildSubjectsFromTopicBank([])).toEqual([]);
  });
});

describe('getIBPYPStaticSubjects', () => {
  test('a known grade returns its real seeded subject list', () => {
    const result = getIBPYPStaticSubjects('Grade 3');
    expect(result.length).toBeGreaterThan(0);
    expect(result.map(s => s.subject)).toEqual(
      expect.arrayContaining(IB_PYP_SUBJECTS_BY_GRADE['Grade 3'].map(s => s.subject))
    );
  });

  test('an unknown grade falls back to Grade 3\'s seed data', () => {
    const result = getIBPYPStaticSubjects('Grade 99');
    const grade3 = getIBPYPStaticSubjects('Grade 3');
    expect(result.map(s => s.subject)).toEqual(grade3.map(s => s.subject));
  });

  test('every returned subject has a topics array, never undefined', () => {
    const result = getIBPYPStaticSubjects('Grade 3');
    result.forEach(s => expect(Array.isArray(s.topics)).toBe(true));
  });
});
