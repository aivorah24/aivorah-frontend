// A teacher's changes to a standard subject path: the outline (order, names, hidden, added chapters/topics) and
// per-topic lessons. The standard chapters stay the base, so later improvements still reach students.

export type EditTopicRef = { key: string; name?: string; hidden?: boolean; added?: boolean };
export type EditChapter = { key: string; title?: string; hidden?: boolean; added?: boolean; topics: EditTopicRef[] };
export type BookQuizQuestion = { question: string; options: string[]; correctIndex: number; explanation?: string; page?: number };
export type LessonEdit = {
  whatYoullLearn?: string[];
  blocks?: any[];
  listenScript?: { heading: string; text: string; [k: string]: any }[];
  listenParts?: { heading: string; text: string; keyIdea?: string }[];
  mathTutor?: any;
  practiceQuiz?: BookQuizQuestion[];
  pdfFile?: string;
  pdfPage?: number;
  bookPath?: string;
  bookUrl?: string;
  bookTitle?: string;
};
export type SubjectEdits = { chapters: EditChapter[]; topics: Record<string, LessonEdit> };

export const EMPTY_EDITS: SubjectEdits = { chapters: [], topics: {} };
export const LESSON_FIELDS_ORDER: (keyof LessonEdit)[] = ['whatYoullLearn', 'blocks', 'listenScript', 'listenParts', 'mathTutor', 'practiceQuiz', 'pdfFile', 'pdfPage', 'bookPath', 'bookUrl', 'bookTitle'];

type BaseTopic = { name: string; [k: string]: any };
type BaseChapter = { title: string; topics: BaseTopic[]; pdfFile?: string | null; [k: string]: any };

export type EditedTopic = BaseTopic & { editKey: string; baseName?: string; hidden?: boolean; added?: boolean; renamed?: boolean; lessonEdit?: LessonEdit };
export type EditedChapter = Omit<BaseChapter, 'topics'> & { editKey: string; hidden?: boolean; added?: boolean; renamed?: boolean; topics: EditedTopic[] };

const lc = (s: string) => String(s || '').trim().toLowerCase();

export function chapterKeyOf(ch: BaseChapter): string {
  return ch.pdfFile ? `pdf:${lc(ch.pdfFile)}` : `title:${lc(ch.title)}`;
}

export function topicKeyOf(chapterKey: string, name: string): string {
  return `${chapterKey}::${lc(name)}`;
}

// Saved order first; anything new in the base goes right after its previous base neighbour.
function mergeOrder<T extends { key: string; added?: boolean }>(baseKeys: string[], saved: T[], make: (key: string) => T): T[] {
  const known = new Set(baseKeys);
  const out = saved.filter((s) => s.added || known.has(s.key));
  const have = new Set(out.map((s) => s.key));
  baseKeys.forEach((key, i) => {
    if (have.has(key)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) {
      const idx = out.findIndex((s) => s.key === baseKeys[j]);
      if (idx >= 0) { at = idx + 1; break; }
    }
    out.splice(at, 0, make(key));
    have.add(key);
  });
  return out;
}

// The full outline as saved: every chapter and topic, in the teacher's order.
export function outlineOf(base: BaseChapter[], edits: SubjectEdits): EditChapter[] {
  const baseKeys = base.map(chapterKeyOf);
  const chapters = mergeOrder(baseKeys, edits.chapters, (key) => ({ key, topics: [] }));
  return chapters.map((c) => {
    const b = base[baseKeys.indexOf(c.key)];
    const topicKeys = b ? b.topics.map((t) => topicKeyOf(c.key, t.name)) : [];
    return { ...c, topics: mergeOrder(topicKeys, c.topics || [], (key) => ({ key })) };
  });
}

// Base chapters with the teacher's changes applied. Students get hidden items removed; the teacher keeps them flagged.
export function applySubjectEdits(base: BaseChapter[], edits: SubjectEdits | null | undefined, opts: { keepHidden?: boolean } = {}): EditedChapter[] {
  const e = edits || EMPTY_EDITS;
  const byKey = new Map(base.map((c) => [chapterKeyOf(c), c]));
  const out = outlineOf(base, e).map((c) => {
    const b = byKey.get(c.key);
    const baseTopics = new Map((b?.topics || []).map((t) => [topicKeyOf(c.key, t.name), t]));
    const topics = c.topics.map((t): EditedTopic => {
      const bt = baseTopics.get(t.key);
      return {
        ...(bt || { kind: 'teacher', page: '', readText: { intro: '', keyLearnings: [], body: [], activity: '', vocab: [] } }),
        name: t.name || bt?.name || 'New topic',
        editKey: t.key,
        baseName: bt?.name,
        hidden: t.hidden,
        added: t.added,
        renamed: !!t.name && !!bt && t.name !== bt.name,
        lessonEdit: e.topics[t.key],
      } as EditedTopic;
    }).filter((t) => opts.keepHidden || !t.hidden);
    return {
      ...(b || { pending: false }),
      title: c.title || b?.title || 'New chapter',
      editKey: c.key,
      hidden: c.hidden,
      added: c.added,
      renamed: !!c.title && !!b && c.title !== b.title,
      topics,
    } as EditedChapter;
  });
  return opts.keepHidden ? out : out.filter((c) => !c.hidden);
}

// ── Edits the teacher makes (all pure: base + edits in, new edits out) ──

type Op = (base: BaseChapter[], edits: SubjectEdits) => SubjectEdits;
const withOutline = (edits: SubjectEdits, chapters: EditChapter[]): SubjectEdits => ({ ...edits, chapters });
const mapChapter = (base: BaseChapter[], edits: SubjectEdits, key: string, f: (c: EditChapter) => EditChapter) =>
  withOutline(edits, outlineOf(base, edits).map((c) => (c.key === key ? f(c) : c)));
const mapTopic = (base: BaseChapter[], edits: SubjectEdits, chapterKey: string, topicKey: string, f: (t: EditTopicRef) => EditTopicRef) =>
  mapChapter(base, edits, chapterKey, (c) => ({ ...c, topics: c.topics.map((t) => (t.key === topicKey ? f(t) : t)) }));

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

const newKey = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const renameChapter = (key: string, title: string): Op => (base, edits) => mapChapter(base, edits, key, (c) => ({ ...c, title }));
export const toggleChapterHidden = (key: string): Op => (base, edits) => mapChapter(base, edits, key, (c) => ({ ...c, hidden: !c.hidden || undefined }));
export const moveChapter = (key: string, dir: -1 | 1): Op => (base, edits) => {
  const outline = outlineOf(base, edits);
  return withOutline(edits, move(outline, outline.findIndex((c) => c.key === key), dir));
};
export const addChapter = (title: string, key = newKey('new-chapter:')): Op => (base, edits) =>
  withOutline(edits, [...outlineOf(base, edits), { key, title, added: true, topics: [] }]);

export const renameTopic = (chapterKey: string, topicKey: string, name: string): Op => (base, edits) =>
  mapTopic(base, edits, chapterKey, topicKey, (t) => ({ ...t, name }));
export const toggleTopicHidden = (chapterKey: string, topicKey: string): Op => (base, edits) =>
  mapTopic(base, edits, chapterKey, topicKey, (t) => ({ ...t, hidden: !t.hidden || undefined }));
export const moveTopic = (chapterKey: string, topicKey: string, dir: -1 | 1): Op => (base, edits) =>
  mapChapter(base, edits, chapterKey, (c) => ({ ...c, topics: move(c.topics, c.topics.findIndex((t) => t.key === topicKey), dir) }));
export const addTopic = (chapterKey: string, name: string, key = newKey(`${chapterKey}::new-topic:`)): Op => (base, edits) =>
  mapChapter(base, edits, chapterKey, (c) => ({ ...c, topics: [...c.topics, { key, name, added: true }] }));

// Only chapters/topics the teacher added can be deleted; standard ones are hidden instead.
export const removeAdded = (chapterKey: string, topicKey?: string): Op => (base, edits) => {
  const outline = outlineOf(base, edits);
  const topics = { ...edits.topics };
  if (!topicKey) {
    const c = outline.find((x) => x.key === chapterKey);
    if (!c?.added) return edits;
    c.topics.forEach((t) => { delete topics[t.key]; });
    return { chapters: outline.filter((x) => x.key !== chapterKey), topics };
  }
  delete topics[topicKey];
  return {
    chapters: outline.map((c) => (c.key === chapterKey ? { ...c, topics: c.topics.filter((t) => !(t.key === topicKey && t.added)) } : c)),
    topics,
  };
};

export const setLesson = (topicKey: string, lesson: LessonEdit): Op => (_base, edits) => ({ ...edits, topics: { ...edits.topics, [topicKey]: lesson } });
export const resetLesson = (topicKey: string): Op => (_base, edits) => {
  const topics = { ...edits.topics };
  delete topics[topicKey];
  return { ...edits, topics };
};

// A lesson the teacher wrote from scratch, in the shape the lesson screen takes for teacher content.
export function lessonAsTeacherContent(lesson: LessonEdit | undefined) {
  return {
    whatYoullLearn: lesson?.whatYoullLearn || [],
    blocks: lesson?.blocks || [],
    listenParts: lesson?.listenParts || (lesson?.listenScript || []).map((s) => ({ heading: s.heading, text: s.text })),
    practiceQuiz: (lesson?.practiceQuiz || []).map((q) => ({ type: 'mcq' as const, question: q.question, options: q.options, correct: q.correctIndex, explanation: q.explanation || '' })),
    ...(lesson?.mathTutor ? { mathTutor: lesson.mathTutor } : {}),
    ...(lesson?.bookUrl || lesson?.pdfFile ? { book: { pdfFile: lesson.pdfFile || '', bookPath: lesson.bookPath || null, pdfPage: lesson.pdfPage || 1, bookUrl: lesson.bookUrl, bookTitle: lesson.bookTitle } } : {}),
  };
}
