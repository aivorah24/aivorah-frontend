import SERVER_URL from '../../../../config/serverUrl';
import type { ChildData } from '../types';

export function mapChild(c: any): ChildData {
  return {
    id: c.id, name: c.name, grade: c.grade,
    curriculum: c.curriculum ?? '', totalTopics: c.totalTopics ?? 0,
    school: c.school ?? '',
    status: (() => {
      const hasActivity = (c.xpPoints ?? 0) > 0 || (c.studyTimeMinutes ?? 0) > 0 || (c.completedTopics?.length ?? 0) > 0;
      if (!hasActivity) return 'getting_started';
      return (c.currentStreak ?? 0) >= 1 ? 'on_track' : 'needs_attention';
    })(),
    xpPoints: c.xpPoints ?? 0,
    completedTopics: c.completedTopics ?? [],
    currentStreak: c.currentStreak ?? 0,
    studyTimeMinutes: c.studyTimeMinutes ?? 0,
    assignmentsDone: c.assignmentsDone ?? 0,
    challengesCompleted: c.challengesCompleted ?? 0,
    lastLesson: c.lastLesson || '',
  };
}

export async function fetchChildren(parentEmail: string): Promise<ChildData[] | null> {
  const res = await fetch(`${SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data.map(mapChild);
  return null;
}

export async function fetchCredentials(parentEmail: string, childId: string) {
  const res = await fetch(`${SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/credentials`);
  return res.ok ? res.json() : null;
}

export async function fetchAIReport(parentEmail: string, childId: string) {
  const res = await fetch(`${SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/ai-report`);
  return res.ok ? res.json() : null;
}

export async function fetchWeeklyActivity(childId: string) {
  const res = await fetch(`${SERVER_URL}/student/${childId}/weekly`);
  return res.json();
}

export async function fetchAssignments(childId: string) {
  const res = await fetch(`${SERVER_URL}/assignments?studentId=${childId}`);
  return res.json();
}

export async function fetchAttendanceSummary(childId: string) {
  const res = await fetch(`${SERVER_URL}/attendance/student/${childId}/summary`);
  return res.json();
}
