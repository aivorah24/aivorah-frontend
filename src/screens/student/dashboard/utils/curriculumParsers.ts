import type { CurriculumData, CurriculumTopic } from '../types';

export function parseNCERTCurriculum(data: any): CurriculumData {
  const chs: { id: number; topic: string; unit: string }[] = data.chapters || [];
  const grade = data.grade || 'Class 3';
  const topics: CurriculumTopic[] = chs.map(ch => ({
    grade, subject: 'Mathematics',
    unit: ch.unit || 'General', topic: ch.topic, content_type: 'text',
  }));
  const grouped: CurriculumData['grouped'] = {};
  topics.forEach(t => {
    if (!grouped[t.grade]) grouped[t.grade] = {};
    if (!grouped[t.grade][t.unit]) grouped[t.grade][t.unit] = [];
    grouped[t.grade][t.unit].push({ topic: t.topic, unit: t.unit });
  });
  return { grades: [grade], topics, grouped, totalTopics: topics.length };
}

export function parseIBPYPCurriculum(data: any): CurriculumData {
  // /curriculum returns { topics: [{grade, subject, unit, topic}], grouped, totalTopics }
  const rawTopics: { grade: string; subject: string; unit: string; topic: string }[] = data.topics || [];
  const topics: CurriculumTopic[] = rawTopics.map(t => ({
    grade: t.grade, subject: t.subject,
    unit: t.unit || 'General', topic: t.topic, content_type: 'text',
  }));
  const grouped: CurriculumData['grouped'] = {};
  topics.forEach(t => {
    if (!grouped[t.grade]) grouped[t.grade] = {};
    if (!grouped[t.grade][t.subject]) grouped[t.grade][t.subject] = [];
    grouped[t.grade][t.subject].push({ topic: t.topic, unit: t.unit });
  });
  const grades = [...new Set(topics.map(t => t.grade))].sort();
  return { grades, topics, grouped, totalTopics: data.totalTopics || topics.length };
}

// ── Static fallback so dashboard never blocks on network ──
export const FALLBACK_CURRICULUM: CurriculumData = (() => {
  const chapters = [
    'Where to Look for Numbers', 'Count in Groups', 'Give and Take',
    'Long and Short', 'Shapes and Angles', 'Fun with Give and Take',
    'Can You Share?', 'Jugs and Mugs', 'How Heavy? How Light?',
    'Play with Patterns', 'Tens and Ones', 'Give and Take Part 2',
    'Smart Charts', 'Rupees and Paise',
  ];
  const topics: CurriculumTopic[] = chapters.map(t => ({
    grade: 'Class 3', subject: 'Mathematics', unit: 'Maths Mela', topic: t, content_type: 'text',
  }));
  const grouped: CurriculumData['grouped'] = { 'Class 3': { 'Maths Mela': topics.map(t => ({ topic: t.topic, unit: t.unit })) } };
  return { grades: ['Class 3'], topics, grouped, totalTopics: topics.length };
})();
