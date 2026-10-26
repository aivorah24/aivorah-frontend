import type { LessonRef } from './learningPathProgress';

export interface SyllabusTopicLike {
  id?: string;
  name: string;
  kind?: string;
  baseName?: string;
}

// LessonScreen params for a syllabus topic — the single definition shared by
// the Learning Paths syllabus screen and the dashboard, so "Continue
// Learning" opens a topic exactly the way the Learning Paths list does.
// A topic with a real syllabus_topics id is fetched by id. Everything else
// from the server — Qdrant topics (kind 'qdrant', synthetic ids) and book
// sections (kind 'section', no id) — is fetched by name. A topic the teacher
// renamed is looked up by its original name.
export function syllabusLessonParams(args: {
  subject: string; curriculum: string; grade: string;
  chapterTitle: string; chapterIndex: number; topicIndex: number;
  topic: SyllabusTopicLike | undefined; isDbBacked: boolean;
}) {
  const { subject, curriculum, grade, chapterTitle, chapterIndex, topicIndex, topic, isDbBacked } = args;
  const isQdrantTopic = isDbBacked && (topic?.kind === 'qdrant' || !topic?.id);
  return {
    subject, curriculum, grade,
    chapterTitle,
    chapterIndex,
    topicIndex,
    // Real teacher-published topic — LessonScreen fetches its resolved
    // resources from the DB instead of the static curated dataset.
    topicId: isDbBacked && !isQdrantTopic ? topic?.id : undefined,
    topicName: isDbBacked ? topic?.name : undefined,
    byNameTopic: isQdrantTopic ? (topic?.baseName || topic?.name) : undefined,
  };
}

export function lessonScreenParams(ref: LessonRef, curriculum: string, grade: string) {
  return syllabusLessonParams({
    subject: ref.subject, curriculum, grade,
    chapterTitle: ref.chapter.title,
    chapterIndex: ref.chapter.chapterIndex,
    topicIndex: ref.topicIndex,
    topic: ref.topic,
    isDbBacked: ref.chapter.isDbBacked,
  });
}
