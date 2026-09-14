import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import PARENT_SERVER_URL from '../../../../config/parentServerUrl';

export async function fetchChildren(parentEmail: string): Promise<any[]> {
  const res = await fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data : [];
}

export interface ProgressData {
  stats: any;
  weekly: number[];
  practiceInsights: any;
}

export async function fetchProgressData(child: any): Promise<ProgressData> {
  const curriculumParam = encodeURIComponent(child.curriculum || 'IB PYP');
  const gradeParam = encodeURIComponent(child.grade || 'Grade 3');
  
  const [statsRes, weeklyRes, trendsRes, topicCountRes] = await Promise.all([
    fetch(`${STUDENTS_SERVER_URL}/student/${child.id}`).then(r => r.json()).catch(() => ({ error: true })),
    fetch(`${STUDENTS_SERVER_URL}/student/${child.id}/weekly`).then(r => r.json()).catch(() => null),
    fetch(`${STUDENTS_SERVER_URL}/student/${child.id}/mistake-trends`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${LEARNING_PATHS_SERVER_URL}/curriculum/topic-count?curriculum=${curriculumParam}&grade=${gradeParam}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  let stats = null;
  if (statsRes && !statsRes.error) {
    if (topicCountRes && typeof topicCountRes.totalTopics === 'number') {
      statsRes.totalTopics = topicCountRes.totalTopics;
    }
    stats = statsRes;
  }

  let weekly = [0, 0, 0, 0, 0, 0, 0];
  if (weeklyRes && weeklyRes.days) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const actMap: Record<string, number> = {};
    weeklyRes.days.forEach((d: any) => { actMap[d.day] = d.studyMinutes; });
    weekly = dayOrder.map(d => actMap[d] ?? 0);
  }

  return {
    stats,
    weekly,
    practiceInsights: trendsRes ?? null,
  };
}
