import { SUBJECT_META, IB_PYP_TOPIC_BANK, IB_PYP_SUBJECTS_BY_GRADE } from './constants';
import type { CurriculumTopic, SubjectData, SubjectMeta, TopicItem } from './types';

export function subjectMeta(subject: string): SubjectMeta {
  // Same soft pastel treatment as every mapped subject — an unmapped name
  // (e.g. a new CBSE subject) should never fall back to a jarring dark card.
  return SUBJECT_META[subject] ?? {
    icon: 'book',
    accentDark: '#BAA467', bgFromDark: '#D8CFA8', bgToDark: '#E6DEBC',
    accentLight: '#BAA467', bgFromLight: '#D8CFA8', bgToLight: '#E6DEBC',
  };
}

export function buildSubjectsFromTopicBank(topics: CurriculumTopic[]): SubjectData[] {
  const subjectMap: Record<string, TopicItem[]> = {};
  for (const entry of topics) {
    if (!subjectMap[entry.subject]) subjectMap[entry.subject] = [];
    subjectMap[entry.subject].push({
      topic: entry.topic,
      unit: entry.unit,
      grade: entry.grade,
      description: `Learn about ${entry.topic} in ${entry.unit}`,
    });
  }

  return Object.entries(subjectMap).map(([subject, subjectTopics]) => ({
    subject,
    topicCount: subjectTopics.length,
    topics: subjectTopics,
  }));
}

export function getIBPYPStaticSubjects(grade: string): SubjectData[] {
  const seed = IB_PYP_SUBJECTS_BY_GRADE[grade] ?? IB_PYP_SUBJECTS_BY_GRADE['Grade 3'];
  const bankSubjects = buildSubjectsFromTopicBank(IB_PYP_TOPIC_BANK.filter((item) => item.grade === grade));
  const bankTopicsBySubject = new Map(bankSubjects.map((item) => [item.subject, item.topics]));

  const seeded = seed.map((item) => ({
    ...item,
    topics: bankTopicsBySubject.get(item.subject) ?? item.topics,
  }));

  const seedSubjects = new Set(seed.map((item) => item.subject));
  const extras = bankSubjects
    .filter((item) => !seedSubjects.has(item.subject))
    .map((item) => ({ ...item }));

  return [...seeded, ...extras];
}
