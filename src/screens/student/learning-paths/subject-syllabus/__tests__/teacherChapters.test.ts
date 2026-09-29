import { teacherChapters } from '../teacherChapters';

test("each teacher unit becomes a chapter of the subject, numbered and labelled like the teacher's document", () => {
  const content = { whatYoullLearn: ['x'], blocks: [] };
  const chapters = teacherChapters([{
    summary: { id: 'lp1', curriculumId: 'c1', title: 'Grade 6 Mathematics', publishedAt: 'x' },
    path: {
      id: 'lp1', curriculumId: 'c1', publishedAt: 'x',
      content: {
        version: 1,
        metadata: { grade: '6', subject: 'Mathematics', curriculum: 'CBSE' },
        units: [
          { title: 'Number Systems', order: 0, topics: [{ title: 'Knowing Our Numbers', order: 0, objectives: [], lessons: [], subtopics: [], content }] },
          { title: null, order: 1, topics: [{ title: 'Not ready', order: 0, objectives: [], lessons: [], subtopics: [], content: null }] },
        ],
      },
    },
  } as any]) as any[];

  expect(chapters.map((c) => [c.title, c.unitNo, c.teacherUnit])).toEqual([['Number Systems', 1, true], ['Unit 2', 2, true]]);
  expect(chapters[0].topics[0]).toMatchObject({ name: 'Knowing Our Numbers', teacherContent: content, comingSoon: false });
  expect(chapters[1].topics[0]).toMatchObject({ name: 'Not ready', comingSoon: true });
  expect(chapters[0].teacherMeta).toEqual({ grade: '6', subject: 'Mathematics', curriculum: 'CBSE' });
});
