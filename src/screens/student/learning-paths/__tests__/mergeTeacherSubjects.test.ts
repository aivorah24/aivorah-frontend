import { mergeTeacherSubjects } from '../mergeTeacherSubjects';

const subject = (name: string) => ({ subject: name, topicCount: 10, topics: [], chapterCount: 10 });
const path = (subjectName: string | null, grade: string | null) => ({ id: `lp-${subjectName}`, curriculumId: 'c', title: 't', grade, subject: subjectName, publishedAt: 'x' });

test('a teacher path for an existing subject tags that card instead of adding a new one', () => {
  const { subjects, teacherSubjects } = mergeTeacherSubjects([subject('Mathematics'), subject('Science')], [path('mathematics', '6')], 'Grade 6');
  expect(subjects.map((s) => s.subject)).toEqual(['Mathematics', 'Science']);
  expect(teacherSubjects.has('mathematics')).toBe(true);
  expect(teacherSubjects.has('science')).toBe(false);
});

test('a subject the curriculum has no card for (e.g. an IB upload) gets its own card', () => {
  const { subjects, teacherSubjects } = mergeTeacherSubjects([subject('Mathematics')], [path('Visual Arts', 'Grade 6')], 'Grade 6');
  expect(subjects.map((s) => s.subject)).toEqual(['Mathematics', 'Visual Arts']);
  expect(subjects[1]).toMatchObject({ topicCount: 0, chapterCount: 0 });
  expect(teacherSubjects.has('visual arts')).toBe(true);
});

test("another grade's path, or one with no subject, is ignored", () => {
  const { subjects, teacherSubjects } = mergeTeacherSubjects([subject('Mathematics')], [path('Science', '7'), path(null, '6')], 'Grade 6');
  expect(subjects).toHaveLength(1);
  expect(teacherSubjects.size).toBe(0);
});
