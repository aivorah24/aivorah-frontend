import SERVER_URL from '../../../../config/serverUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import type { ChildData } from '../types';
import { childStudentStatus } from '../../../../utils/studentStatus';
import { fetchStudentAttendanceSummary } from '../../../../services/attendanceClient';

export function mapChild(c: any): ChildData {
  return {
    id: c.id, name: c.name, grade: c.grade,
    curriculum: c.curriculum ?? '', totalTopics: c.totalTopics ?? 0,
    school: c.school ?? '',
    status: childStudentStatus(c),
    lastActive: c.lastActive ?? null,
    xpPoints: c.xpPoints ?? 0,
    completedTopics: c.completedTopics ?? [],
    currentStreak: c.currentStreak ?? 0,
    studyTimeMinutes: c.studyTimeMinutes ?? 0,
    assignmentsDone: c.assignmentsDone ?? 0,
    challengesCompleted: c.challengesCompleted ?? 0,
    lastLesson: c.lastLesson || '',
  };
}

// aivorah-students-service now owns GET /parent/:email/children (ported off
// the monolith, totalTopics sourced from aivorah-learning-paths-service's
// Qdrant-backed /curriculum/topic-count instead of embedded here) - the
// /credentials and /ai-report routes below are still monolith-only.
export async function fetchChildren(parentEmail: string): Promise<ChildData[] | null> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
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

// aivorah-attendance-service (signed in); ratePct is null when nothing has been marked yet.
export function fetchAttendanceSummary(childId: string) {
  return fetchStudentAttendanceSummary(childId);
}
