import { SUBJECT_META, IB_PYP_TOPIC_BANK, IB_PYP_SUBJECTS_BY_GRADE } from './constants';
import type { CurriculumTopic, SubjectData, SubjectMeta, TopicItem } from './types';
import { isCbseCurriculum } from '../../../utils/curriculum';

export function subjectMeta(subject: string): SubjectMeta {
  // Same gold treatment as every mapped subject (see SUBJECT_META) — an
  // unmapped name (e.g. a new CBSE subject) should never fall back to a
  // different color than the rest of the grid.
  return SUBJECT_META[subject] ?? {
    icon: 'book',
    accentDark: '#C9A24E', bgFromDark: '#E4D4A8', bgToDark: '#F0E2BC',
    accentLight: '#C9A24E', bgFromLight: '#E4D4A8', bgToLight: '#F0E2BC',
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

// Shared by the student screen and Parental Controls so both resolve a users-row curriculum the same way.
export function curriculumFlags(curriculum: string) {
  // Normalise IB PYP — stored value may have space or underscore
  const isPYP = /^ib.?pyp$/i.test(curriculum.trim());
  const isCBSE = !isPYP && isCbseCurriculum(curriculum);
  return { isPYP, isCBSE, label: isCBSE ? 'CBSE' : curriculum };
}
