import { SUBJECT_CONFIG, SUBJECT_ACCENT_COLOR, ACHIEVEMENT_DEFS } from '../constants';
import type { SubjectStat, Achievement } from '../types';
import type { BarTopic } from '../../utils/performanceStats';

export function subjectColor(s: string): string {
  return SUBJECT_CONFIG[s]?.color ?? SUBJECT_ACCENT_COLOR;
}

export function subjectIcon(s: string) {
  return SUBJECT_CONFIG[s]?.icon ?? 'book-open';
}

export function computeOverallPct(completedCount: number, totalTopics: number): number {
  return totalTopics > 0 ? Math.min(100, Math.round((completedCount / totalTopics) * 100)) : 0;
}

// Per-subject chapters mastered, from the same chapter list the Dashboard uses.
export function computeSubjectStats(chapters: BarTopic[] | null): SubjectStat[] {
  if (!chapters) return [];
  const result: { name: string; total: number; done: number }[] = [];
  for (const ch of chapters) {
    const existing = result.find(r => r.name === ch.subject);
    if (existing) { existing.total += 1; existing.done += ch.mastered ? 1 : 0; }
    else result.push({ name: ch.subject, total: 1, done: ch.mastered ? 1 : 0 });
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
  const progressByKey: Record<string, { current: number; target: number; unit: string }> = {
    streak:     { current: stats.currentStreak,       target: 1,   unit: 'day' },
    firstTopic: { current: completedCount,            target: 1,   unit: 'topic' },
    topics5:    { current: completedCount,            target: 5,   unit: 'topics' },
    topics10:   { current: completedCount,            target: 10,  unit: 'topics' },
    xp500:      { current: stats.xpPoints,            target: 500, unit: 'XP' },
    hour1:      { current: stats.studyTimeMinutes,    target: 60,  unit: 'min' },
    level2:     { current: stats.level,               target: 2,   unit: 'level' },
    challenge1: { current: stats.challengesCompleted, target: 1,   unit: 'challenge' },
  };
  return ACHIEVEMENT_DEFS.map(def => {
    const p = progressByKey[def.key];
    const unlocked = p.current >= p.target;
    return {
      label: def.label(stats.currentStreak),
      icon: def.icon,
      color: def.color,
      unlocked,
      hint: unlocked ? undefined : `${Math.max(0, p.current)} / ${p.target} ${p.unit}`,
    };
  });
}
