import { type SyllabusChapter } from '../../../../data/cbseG6EnglishSyllabus';
import type { LoadedTeacherPath } from '../teacher-learning-paths/hooks/useTeacherPaths';

// A teacher's units shown as ordinary chapters of the subject. Each topic carries the teacher's content, so opening
// it goes straight to the lesson screen. `teacherUnit` marks them (numbered and labelled "Unit" like the teacher's
// own document, so they never clash with the book's chapter numbers).
export function teacherChapters(paths: LoadedTeacherPath[]): SyllabusChapter[] {
  return paths.flatMap(({ path }) => path.content.units.map((unit, ui) => ({
    title: unit.title || `Unit ${ui + 1}`,
    unitNo: ui + 1,
    pending: false,
    teacherUnit: true,
    teacherMeta: path.content.metadata || {},
    topics: unit.topics.map((t) => ({
      name: t.title || 'Topic',
      kind: 'teacher',
      page: '',
      comingSoon: !t.content,
      teacherContent: t.content,
      unitOrder: unit.order,
      topicOrder: t.order,
      readText: { intro: '', keyLearnings: [], body: [], activity: '', vocab: [] },
    })),
  }) as unknown as SyllabusChapter));
}
