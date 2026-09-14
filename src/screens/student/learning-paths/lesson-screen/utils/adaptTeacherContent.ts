// Adapts a teacher-published curriculum learning-path topic's AI-generated
// content (services/curriculum/blockSchema.js block shapes, produced by
// aivorah-learning-paths-service) into the same `dbTopic`-shaped object
// useDbTopic() returns — so ReadTab/ListenTab/AskTab/PracticeTab render it
// with zero changes of their own, the same components already used for
// Qdrant/DB-backed topics.

export interface TeacherBlock {
  type: string;
  text?: string;
  items?: { term?: string; definition?: string; meaning?: string; name?: string; description?: string }[];
  steps?: { step?: number; action: string; equation?: string; why: string }[] | string[];
  problem?: string;
  finalAnswer?: string;
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

  const workedExamples = blocks
    .filter((b) => b.type === 'worked_example')
    .map((b) => ({
      problem: b.problem || '',
      steps: (b.steps as { action: string; equation?: string }[] || []).map((s) =>
        s.equation ? `${s.action}: ${s.equation}` : s.action
      ),
      answer: b.finalAnswer || '',
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
    },
  } as any;
}
