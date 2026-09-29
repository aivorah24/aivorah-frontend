import { mergeTeacherSubjects } from '../mergeTeacherSubjects';

const subject = (name: string, extra = {}) => ({ subject: name, topicCount: 10, topics: [], ...extra });
function teacherPath(subjectName: string | null, grade: string | null, units: [string, string[]][]) {
  return {
    summary: { id: `lp-${subjectName}`, curriculumId: 'c', title: 't', grade, subject: subjectName, publishedAt: 'x' },
    path: {
      id: 'lp', curriculumId: 'c', publishedAt: 'x',
      content: {
        version: 1,
        metadata: { grade: grade || undefined, subject: subjectName || undefined },
        units: units.map(([title, topics], ui) => ({
          title, order: ui,
          topics: topics.map((t, ti) => ({ title: t, order: ti, objectives: [], lessons: [], subtopics: [], content: { whatYoullLearn: [], blocks: [] } })),
        })),
      },
    },
  } as any;
}

test('teacher units add to an existing chapter-counted subject: chapters and topics both grow, no new card', () => {
  const merged = mergeTeacherSubjects(
    [subject('Science', { chapterCount: 12, topicCount: 24 })],
    [teacherPath('science', '6', [['Plants', ['Leaves', 'Roots']], ['Animals', ['Birds']]])],
    'Grade 6',
  );
  expect(merged).toHaveLength(1);
  expect(merged[0]).toMatchObject({ subject: 'Science', chapterCount: 14, topicCount: 27 });
  expect(merged[0].topics.map((t) => t.topic)).toEqual(['Leaves', 'Roots', 'Birds']);
});

test('a card that counts its book chapters as "topics" (Maths) grows its count by the teacher units', () => {
  const merged = mergeTeacherSubjects(
    [subject('Mathematics', { topicCount: 10 })],
    [teacherPath('Mathematics', '6', [['Number Systems', ['A', 'B']], ['Fractions', ['C']], ['Geometry', ['D']]])],
    'Grade 6',
  );
  expect(merged[0]).toMatchObject({ subject: 'Mathematics', topicCount: 13 });
});

test('IB: a subject with no standard syllabus gets a card built from the teacher path', () => {
  const merged = mergeTeacherSubjects([], [teacherPath('Visual Arts', '3', [['Colour', ['Mixing', 'Shades']]])], 'Grade 3');
  expect(merged).toEqual([expect.objectContaining({ subject: 'Visual Arts', chapterCount: 1, topicCount: 2, units: ['Colour'] })]);
});

test("another grade's path, or one with no subject, is ignored", () => {
  const merged = mergeTeacherSubjects([subject('Mathematics')], [teacherPath('Science', '7', [['X', ['y']]]), teacherPath(null, '6', [['X', ['y']]])], 'Grade 6');
  expect(merged).toEqual([subject('Mathematics')]);
});
