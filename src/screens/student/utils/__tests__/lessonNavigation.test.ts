import { syllabusLessonParams, lessonScreenParams } from '../lessonNavigation';

describe('syllabusLessonParams — same LessonScreen params as the Learning Paths list', () => {
  const base = { subject: 'English', curriculum: 'CBSE', grade: 'Grade 9', chapterTitle: 'Bit and Wisdom', chapterIndex: 0, topicIndex: 1 };

  test('a DB topic with a real id opens by id', () => {
    expect(syllabusLessonParams({ ...base, topic: { id: 't1', name: 'Poem', kind: 'section' }, isDbBacked: true }))
      .toEqual({ ...base, topicId: 't1', topicName: 'Poem', byNameTopic: undefined });
  });

  test('a Qdrant topic opens by name', () => {
    expect(syllabusLessonParams({ ...base, topic: { id: 'q:1', name: 'Poem', kind: 'qdrant' }, isDbBacked: true }))
      .toMatchObject({ topicId: undefined, topicName: 'Poem', byNameTopic: 'Poem' });
  });

  test('a curated (static) topic opens by chapter/topic index only', () => {
    expect(syllabusLessonParams({ ...base, topic: { name: 'Poem' }, isDbBacked: false }))
      .toMatchObject({ topicId: undefined, topicName: undefined, byNameTopic: undefined, chapterIndex: 0, topicIndex: 1 });
  });

  test('lessonScreenParams maps a dashboard LessonRef', () => {
    const ref = {
      subject: 'English', topicIndex: 0, topic: { id: 'e3', name: 'The Kite' },
      chapter: { subject: 'English', title: 'The Kite', chapterNo: 2, chapterIndex: 1, topics: [{ id: 'e3', name: 'The Kite' }], isDbBacked: true },
    };
    expect(lessonScreenParams(ref, 'CBSE', 'Grade 9')).toEqual({
      subject: 'English', curriculum: 'CBSE', grade: 'Grade 9', chapterTitle: 'The Kite', chapterIndex: 1, topicIndex: 0,
      topicId: 'e3', topicName: 'The Kite', byNameTopic: undefined,
    });
  });
});
