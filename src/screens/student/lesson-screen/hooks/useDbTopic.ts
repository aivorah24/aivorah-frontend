import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';
import { type CBSE_G6_ENGLISH_SYLLABUS } from '../../../../data/cbseG6EnglishSyllabus';

// A real teacher-published topic (has a DB id) fetches its resolved
// Read/Listen/Practice content instead of the static curated dataset —
// this is what makes an uploaded book actually reach students.
export function useDbTopic(topicId: string | undefined, topicNameParam: string | undefined) {
  const [dbTopic, setDbTopic] = useState<typeof CBSE_G6_ENGLISH_SYLLABUS[0]['topics'][0] | null>(null);
  // Raw AI_EXPLANATION payload — fed to the type-driven LessonRenderer so the
  // Learn view is composed from canonical components (poem/story/math layouts),
  // not a hardcoded flat template.
  const [rawPayload, setRawPayload] = useState<any>(null);
  const [loadingDbTopic, setLoadingDbTopic] = useState(!!topicId);

  useEffect(() => {
    if (!topicId) { setLoadingDbTopic(false); return; }
    let cancelled = false;
    setLoadingDbTopic(true);
    fetch(`${SERVER_URL}/teacher/syllabus/topic/${topicId}/resources`)
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
        const p = explanation?.status === 'READY' ? (explanation.payload || {}) : {};
        setRawPayload(p);
        const hasRich = Array.isArray(p.body) && p.body.length > 0;
        const realImg = images?.status === 'READY' ? images.payload?.items?.[0]?.description : undefined;
        setDbTopic({
          name: topicNameParam || 'This topic',
          kind: 'Chapter',
          page: images?.payload?.pageRef ? String(images.payload.pageRef) : '',
          // Real source PDF → the "View in Book" right pane shows the actual
          // NCERT book (with its illustrations), same as the curated G6 topics.
          pdfFile: p.pdfFile || undefined,
          pdfPage: p.pdfFile ? (p.pdfPage || 1) : undefined,
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
        setLoadingDbTopic(false);
      })
      .catch(() => { if (!cancelled) setLoadingDbTopic(false); });
    return () => { cancelled = true; };
  }, [topicId]);

  return { dbTopic, rawPayload, loadingDbTopic };
}
