import { useEffect, useRef, useState } from 'react';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import { type CBSE_G6_ENGLISH_SYLLABUS } from '../../../../../data/cbseG6EnglishSyllabus';

// A topic identified by name+subject+grade+curriculum instead of a DB id —
// real NCERT/Qdrant-only content (e.g. "Ability Beyond Disability", Grade 9
// English) that has no syllabus_topics row at all. See Bug #8
// (BUGS_AND_FIXES.md): this is what lets such a topic reach the current
// Learn/AI Tutor/Ask Aivorah/Practice flow instead of falling back to the
// deprecated VideoLesson screen just because it isn't in syllabusRegistry.ts.
export interface TopicByName {
  curriculum: string;
  grade: string;
  subject: string;
  topic: string;
}

// A real teacher-published topic (has a DB id) fetches its resolved
// Read/Listen/Practice content instead of the static curated dataset —
// this is what makes an uploaded book actually reach students. A topic
// identified by name instead (`byName`) resolves the same way, straight
// from Qdrant — see TopicByName above.
// `override`: the teacher's edited lesson fields, laid over what the server returns.
export function useDbTopic(topicId: string | undefined, topicNameParam: string | undefined, byName?: TopicByName, opts?: { enabled?: boolean; override?: Record<string, any> }) {
  const [dbTopic, setDbTopic] = useState<typeof CBSE_G6_ENGLISH_SYLLABUS[0]['topics'][0] | null>(null);
  // Raw AI_EXPLANATION payload — fed to the type-driven LessonRenderer so the
  // Learn view is composed from canonical components (poem/story/math layouts),
  // not a hardcoded flat template.
  const [rawPayload, setRawPayload] = useState<any>(null);
  // enabled:false skips the fetch entirely — used when the caller already has
  // teacher-published content (route params) and would otherwise fire a
  // pointless/failing lookup for a topic with no syllabus_topics row.
  const enabled = opts?.enabled !== false;
  const active = enabled && (!!topicId || !!byName);
  const [loadingDbTopic, setLoadingDbTopic] = useState(active);
  // Whether the Learn (AI_EXPLANATION) resource is actually READY — as
  // opposed to COMING_SOON/UNDER_REVIEW/NOT_AVAILABLE, or neither a topicId
  // nor byName at all (curated topics are always considered ready). Lets the
  // Learn tab show an honest "Coming Soon" state instead of silently
  // rendering an empty lesson.
  const [contentReady, setContentReady] = useState(!active);
  const byNameKey = byName ? `${byName.curriculum}|${byName.grade}|${byName.subject}|${byName.topic}` : undefined;
  const override = opts?.override;
  const overrideKey = override ? JSON.stringify(override) : '';
  // Only a different topic shows the loading state; the teacher's newly published edits swap in place.
  const shownTopic = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      // data fetching effect guard — nothing to fetch, resolve loading state immediately
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingDbTopic(false);
      return;
    }
    let cancelled = false;
    const topicKey = `${topicId || ''}|${byNameKey || ''}`;
    if (shownTopic.current !== topicKey) setLoadingDbTopic(true);
    const url = topicId
      ? `${LEARNING_PATHS_SERVER_URL}/teacher/syllabus/topic/${topicId}/resources`
      : `${LEARNING_PATHS_SERVER_URL}/teacher/syllabus/topic-by-name/resources?${new URLSearchParams({
          curriculum: byName!.curriculum, grade: byName!.grade, subject: byName!.subject, topic: byName!.topic,
        }).toString()}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const byType: Record<string, any> = {};
        for (const r of data.resources || []) byType[r.resourceType] = r;
        const explanation = byType.AI_EXPLANATION;
        const images = byType.IMAGES;
        // The RAG-grounded G1 pipeline stores a rich payload on AI_EXPLANATION
        // (intro, keyLearnings, body, activity, vocab, listenParts, mathHelper).
        // Older imported topics only carry { text } — handle both. We never
        // synthesize a blank figure box: figureUrl stays undefined unless a real
        // image exists.
        const edited = !!override && Object.keys(override).length > 0;
        const p = { ...(explanation?.status === 'READY' ? (explanation.payload || {}) : {}), ...(edited ? override : {}) };
        setRawPayload(p);
        setContentReady(explanation?.status === 'READY' || edited);
        const hasRich = Array.isArray(p.body) && p.body.length > 0;
        const realImg = images?.status === 'READY' ? images.payload?.items?.[0]?.description : undefined;
        setDbTopic({
          name: topicNameParam || 'This topic',
          kind: 'Chapter',
          page: images?.payload?.pageRef ? String(images.payload.pageRef) : '',
          // Real source PDF → the "View in Book" right pane shows the actual
          // NCERT book (with its illustrations), same as the curated G6 topics.
          // A teacher's uploaded book (bookUrl) takes the place of the standard book.
          pdfFile: p.bookUrl ? (p.pdfFile || 'teacher-book.pdf') : (p.pdfFile || undefined),
          pdfPage: p.pdfFile || p.bookUrl ? (p.pdfPage || 1) : undefined,
          bookUrl: p.bookUrl || undefined,
          bookTitle: p.bookTitle || undefined,
          // Exact storage path from the syllabus map, so the reader opens the
          // right book without the client re-deriving a folder name.
          bookPath: p.bookPath || undefined,
          readText: {
            intro: p.intro || (typeof p.text === 'string' ? p.text : '') || '',
            keyLearnings: Array.isArray(p.keyLearnings) ? p.keyLearnings : [],
            body: hasRich ? p.body : [],
            figureUrl: realImg || undefined,
            figureCaption: realImg || '',
            activity: p.activity || '',
            vocab: Array.isArray(p.vocab) ? p.vocab : [],
            listenParts: Array.isArray(p.listenParts) ? p.listenParts : undefined,
            example: p.mathHelper?.example || undefined,
            mathHelper: p.mathHelper || undefined,
            // Richer schema fields the Curriculum Intelligence pipeline emits —
            // now carried through so the Learn view can render the full lesson
            // (poem lines, takeaways, reflection) instead of silently dropping them.
            originalLesson: Array.isArray(p.originalLesson) ? p.originalLesson : undefined,
            keyTakeaways: Array.isArray(p.keyTakeaways) ? p.keyTakeaways : [],
            thinkAndReflect: Array.isArray(p.thinkAndReflect) ? p.thinkAndReflect : [],
            workedExamples: Array.isArray(p.workedExamples) ? p.workedExamples : undefined,
            illustrationPrompts: Array.isArray(p.illustrationPrompts) ? p.illustrationPrompts : [],
            instructionalType: typeof p.instructionalType === 'string' ? p.instructionalType : undefined,
          },
        } as any);
        shownTopic.current = topicKey;
        setLoadingDbTopic(false);
      })
      .catch(() => { if (!cancelled) { setContentReady(false); setLoadingDbTopic(false); } });
    return () => { cancelled = true; };
  }, [topicId, byNameKey, enabled, overrideKey]);

  return { dbTopic, rawPayload, loadingDbTopic, contentReady };
}
