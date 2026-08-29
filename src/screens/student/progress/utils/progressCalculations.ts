import { SUBJECT_CONFIG, SUBJECT_ACCENT_COLOR, ACHIEVEMENT_DEFS } from '../constants';
import type { CurriculumData, CurriculumTopic, SubjectStat, Achievement } from '../types';

export function subjectColor(s: string): string {
  return SUBJECT_CONFIG[s]?.color ?? SUBJECT_ACCENT_COLOR;
}

export function subjectIcon(s: string) {
  return SUBJECT_CONFIG[s]?.icon ?? 'book-open';
}

// Same shapes DashboardScreen builds from the same endpoints, kept in sync so
// Subject Performance here matches what Dashboard shows.
export function parseNCERTCurriculum(data: any, grade: string): CurriculumData {
  const chs: { topic: string; unit?: string }[] = data.chapters || [];
  const topics: CurriculumTopic[] = chs.map(ch => ({ grade, subject: 'Mathematics', unit: ch.unit || 'General', topic: ch.topic }));
  const grouped: CurriculumData['grouped'] = { [grade]: { Mathematics: topics.map(t => ({ topic: t.topic, unit: t.unit })) } };
  return { grades: [grade], topics, grouped, totalTopics: topics.length };
}

export function parseIBPYPCurriculum(data: any): CurriculumData {
  const rawTopics: { grade: string; subject: string; unit: string; topic: string }[] = data.topics || [];
  const topics: CurriculumTopic[] = rawTopics.map(t => ({ grade: t.grade, subject: t.subject, unit: t.unit || 'General', topic: t.topic }));
  const grouped: CurriculumData['grouped'] = {};
  topics.forEach(t => {
    if (!grouped[t.grade]) grouped[t.grade] = {};
    if (!grouped[t.grade][t.subject]) grouped[t.grade][t.subject] = [];
    grouped[t.grade][t.subject].push({ topic: t.topic, unit: t.unit });
  });
  const grades = [...new Set(topics.map(t => t.grade))].sort();
  return { grades, topics, grouped, totalTopics: data.totalTopics || topics.length };
}

export function computeOverallPct(completedCount: number, totalTopics: number): number {
  return totalTopics > 0 ? Math.min(100, Math.round((completedCount / totalTopics) * 100)) : 0;
}

// Subject performance: % of topics completed per subject.
export function computeSubjectStats(curriculum: CurriculumData | null, completedSet: Set<string>): SubjectStat[] {
  if (!curriculum) return [];
  const result: { name: string; total: number; done: number }[] = [];
  for (const grade of curriculum.grades) {
    for (const [subject, topics] of Object.entries(curriculum.grouped[grade] ?? {})) {
      const existing = result.find(r => r.name === subject);
      const done = topics.filter(t => completedSet.has(t.topic)).length;
      if (existing) { existing.total += topics.length; existing.done += done; }
      else result.push({ name: subject, total: topics.length, done });
    }
  }
  return result.map(r => ({
    name: r.name,
    total: r.total,
    done: r.done,
    pct: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
    color: subjectColor(r.name),
    icon: subjectIcon(r.name),
  }));
}

export function computeMaxMinutes(weeklyDays: { studyMinutes: number }[]): number {
  return Math.max(...weeklyDays.map(d => d.studyMinutes), 1);
}

interface AchievementStats {
  currentStreak: number;
  xpPoints: number;
  studyTimeMinutes: number;
  level: number;
  challengesCompleted: number;
}

// Achievements — unlocked based on real milestones. Order/labels/thresholds
// match the original inline list exactly.
export function computeAchievements(stats: AchievementStats, completedCount: number): Achievement[] {
  const unlockedByKey: Record<string, boolean> = {
    streak: stats.currentStreak >= 1,
    firstTopic: completedCount >= 1,
    topics5: completedCount >= 5,
    topics10: completedCount >= 10,
    xp500: stats.xpPoints >= 500,
    hour1: stats.studyTimeMinutes >= 60,
    level2: stats.level >= 2,
    challenge1: stats.challengesCompleted >= 1,
  };
  return ACHIEVEMENT_DEFS.map(def => ({
    label: def.label(stats.currentStreak),
    icon: def.icon,
    color: def.color,
    unlocked: unlockedByKey[def.key],
  }));
}
