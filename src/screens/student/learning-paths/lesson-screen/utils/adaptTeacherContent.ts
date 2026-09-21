// Adapts a teacher-published curriculum learning-path topic's AI-generated
// content (services/curriculum/blockSchema.js block shapes, produced by
// aivorah-learning-paths-service) into the same `dbTopic`-shaped object
// useDbTopic() returns — so ReadTab/ListenTab/AskTab/PracticeTab render it
// with zero changes of their own, the same components already used for
// Qdrant/DB-backed topics.

export interface TeacherBlock {
  type: string;
  text?: string;
  items?: { term?: string; definition?: string; meaning?: string; name?: string; description?: string; cause?: string; effect?: string }[];
  steps?: { step?: number; step_number?: number; action?: string; explanation?: string; equation?: string; calculation?: string; why?: string }[] | string[];
  problem?: string;
  finalAnswer?: string;
  synthetic?: boolean;
  exampleType?: 'SOURCE_DERIVED' | 'GROUNDED_SYNTHETIC' | 'UNSUPPORTED';
  url?: string;
  caption?: string;
  alt_text?: string;
  title?: string;
  events?: { date?: string; description?: string }[];
  headers?: string[];
  rows?: string[][];
}

export interface TeacherTopicContent {
  whatYoullLearn: string[];
  blocks: TeacherBlock[];
  contentType?: string;
}

function paragraphFor(block: TeacherBlock): string {
  if (block.type === 'explanation' || block.type === 'overview') return block.text || '';
  if (block.type === 'process') return (block.steps as string[] || []).join(' -> ');
  if (block.type === 'comparison') {
    return (block.items || []).map((i) => `${i.name}: ${i.description}`).join('; ');
  }
  return block.text || '';
}

export function adaptTeacherContentToTopic(topicTitle: string, content: TeacherTopicContent | null | undefined) {
  const blocks = content?.blocks || [];
  const introBlock = blocks.find((b) => b.type === 'overview' || b.type === 'explanation');
  const intro = introBlock?.text || (content?.whatYoullLearn || []).join(' ') || '';

  const body = blocks
    .filter((b) => b !== introBlock && (b.type === 'explanation' || b.type === 'process' || b.type === 'comparison'))
    .map(paragraphFor)
    .filter(Boolean);

  const activityBlock = blocks.find((b) => b.type === 'activity');
  const vocabBlock = blocks.find((b) => b.type === 'key_terms' || b.type === 'vocabulary');
  const vocab = (vocabBlock?.items || []).map((i) => ({ word: i.term || '', definition: i.definition || i.meaning || '' }));
  const imageBlock = blocks.find((b) => b.type === 'image' || b.type === 'visual_representation');
  // Structured fallback when no grounded image exists for the topic (e.g. a
  // Place Value Chart) — see blockSchema.js's `table` type.
  const tableBlock = blocks.find((b) => b.type === 'table');

  const workedExamples = blocks
    .filter((b) => b.type === 'worked_example')
    .map((b) => ({
      problem: b.problem || '',
      // Steps carry either the legacy {action, equation} shape or the newer
      // {explanation, calculation} shape (see blockSchema.js) — normalize
      // both to a flat display string.
      steps: (b.steps as { action?: string; explanation?: string; equation?: string; calculation?: string }[] || []).map((s) => {
        const label = s.explanation || s.action || '';
        const detail = s.calculation || s.equation;
        return detail ? `${label}: ${detail}` : label;
      }),
      answer: b.finalAnswer || '',
      synthetic: b.synthetic === true,
      exampleType: b.exampleType,
    }));

  return {
    name: topicTitle || 'This topic',
    kind: 'Topic',
    page: '',
    readText: {
      intro,
      keyLearnings: content?.whatYoullLearn || [],
      body,
      activity: activityBlock?.text || '',
      vocab,
      workedExamples: workedExamples.length > 0 ? workedExamples : undefined,
      figureUrl: imageBlock?.url || undefined,
      figureCaption: imageBlock?.caption || '',
      table: tableBlock ? { caption: tableBlock.caption, headers: tableBlock.headers || [], rows: tableBlock.rows || [] } : undefined,
    },
  } as any;
}
