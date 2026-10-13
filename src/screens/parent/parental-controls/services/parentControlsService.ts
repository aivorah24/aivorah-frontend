import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import PARENTAL_CONTROLS_SERVER_URL from '../../../../config/parentalControlsServerUrl';
import type { Child, Controls } from '../types';

// Children list comes from the SAME Supabase project (Dev DB) as the
// parental-controls service's own parent_children/screen_time checks -
// aivorah-students-service already serves this shape from that project.
// Pulling the list from the monolith instead would hand back child ids from
// a DIFFERENT database, which the parental-controls service's parent_children
// lookup would never match (confirmed via a live check: the monolith and Dev
// DB have separate rows, with different ids, for the same test accounts).
export async function fetchChildren(parentEmail: string): Promise<Child[]> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchScreenTime(parentEmail: string, childId: string): Promise<any> {
  const res = await fetch(`${PARENTAL_CONTROLS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/screen-time`);
  if (!res.ok) throw new Error(`GET screen-time -> ${res.status}`);
  return res.json();
}

const UNREACHABLE = "Couldn't reach parental controls. Please try again.";

export async function saveScreenTime(
  parentEmail: string,
  childId: string,
  ctrl: Controls,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${PARENTAL_CONTROLS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/screen-time`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyLimitMinutes: ctrl.dailyLimitMinutes,
        enabled: ctrl.isEnabled,
        lockWhenReached: ctrl.lockWhenReached,
        weeklyCapEnabled: ctrl.weeklyCapEnabled,
        weeklyCapMinutes: ctrl.weeklyCapMinutes,
        allowedHoursEnabled: ctrl.allowedHoursEnabled,
        allowedHoursStart: ctrl.allowedHoursStart,
        allowedHoursEnd: ctrl.allowedHoursEnd,
        breakEnforcerEnabled: ctrl.breakEnforcerEnabled,
        breakIntervalMinutes: ctrl.breakIntervalMinutes,
        breakDurationMinutes: ctrl.breakDurationMinutes,
        homeworkFirstEnabled: ctrl.homeworkFirstEnabled,
        subjectFilterEnabled: ctrl.subjectFilterEnabled,
        blockedSubjects: ctrl.blockedSubjects,
      }),
    },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) return { success: false, error: data?.error || UNREACHABLE };
  return data;
}
