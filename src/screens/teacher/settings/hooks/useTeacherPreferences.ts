import { useEffect, useState } from 'react';
import { fetchTeacherPreferences, patchTeacherPreference } from '../services/settingsService';

// Teaching prefs that are ENFORCED server-side (AI Auto-Grading, Share
// Progress) — loaded from the server profile and PATCHed on every toggle so
// the change takes effect immediately. teacherRoleVal/experienceVal are
// read-only display fields loaded from the same profile, never toggled here.
export function useTeacherPreferences(email: string | undefined) {
  const [autoGrading, setAutoGrading] = useState(true);
  const [shareProgress, setShareProgress] = useState(true);
  const [teacherRoleVal, setTeacherRoleVal] = useState<string | null>(null);
  const [experienceVal, setExperienceVal] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    fetchTeacherPreferences(email)
      .then(p => {
        if (!p) return;
        if (p.autoGrading != null) setAutoGrading(p.autoGrading);
        if (p.shareProgress != null) setShareProgress(p.shareProgress);
        if (p.teacherRole != null) setTeacherRoleVal(p.teacherRole);
        if (p.experience != null) setExperienceVal(p.experience);
      })
      .catch(() => {});
  }, [email]);

  function saveTeacherPref(key: 'autoGrading' | 'shareProgress', value: boolean) {
    if (!email) return;
    patchTeacherPreference(email, key, value).catch(() => {});
  }

  return {
    autoGrading, setAutoGrading,
    shareProgress, setShareProgress,
    teacherRoleVal, experienceVal,
    saveTeacherPref,
  };
}
