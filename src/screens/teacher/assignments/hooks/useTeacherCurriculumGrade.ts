import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { GRADES_TEACHER } from '../../../onboarding/OnboardingScreen';
import { ALL_GRADES, IB_GRADES } from '../constants';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

// Owns the teacher's curriculum/grade/subject-topic derivation for the
// Generate/Upload/Bulk forms — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx as the first step of its hooks/components
// decomposition (2026-08-25), following the same pattern already used by
// src/screens/student/assignments/hooks/useAssignments.ts.
export function useTeacherCurriculumGrade(user: any, subject: string) {
  const teacherCurriculum = user?.teaches?.[0]?.curriculum || user?.curriculum || '';
  const defaultGrade = user?.teaches?.[0]?.grade || 'Grade 3';
  const [grade, setGrade] = useState(defaultGrade);
  const [curriculum, setCurriculum] = useState(teacherCurriculum);

  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Grades + curricula this teacher handles — fetched authoritatively from their
  // saved preferences (teaches[]), since user.teaches on the cached profile can be stale.
  const [fetchedGrades, setFetchedGrades] = useState<string[]>([]);
  const [fetchedCurricula, setFetchedCurricula] = useState<string[]>([]);

  const teacherEmail = user?.email || 'teacher@demo.com';
  // Only real IB PYP — IB MYP/DP teachers were getting the PYP generator and labels.
  const isIBPYP = /^ib[\s_-]*pyp$/i.test((curriculum || teacherCurriculum || '').trim());

  // Grade pills: only show grades the teacher handles. Prefer the freshly-fetched
  // teaches[] grades; fall back to user.teaches; only show the full list if we
  // genuinely have no info for this teacher.
  const teachesGrades = Array.isArray(user?.teaches) && user.teaches.length > 0
    ? user.teaches.map((t: any) => t.grade || t).filter(Boolean)
    : [];
  const teacherGrades = fetchedGrades.length > 0 ? fetchedGrades : teachesGrades;
  const fullGradeList = isIBPYP ? IB_GRADES : ALL_GRADES;
  // Show exactly the grades this teacher handles (ordered by the full teacher grade
  // list so e.g. UKG sorts before Grade 4). Don't intersect with ALL_GRADES — that
  // list only spans Grade 3–9 and would drop Nursery/LKG/UKG/Grade 1-2/10-12.
  const orderedTeacherGrades = GRADES_TEACHER.filter((g) => teacherGrades.includes(g));
  const baseGradeOptions = teacherGrades.length > 0
    ? (orderedTeacherGrades.length > 0 ? orderedTeacherGrades : teacherGrades)
    : fullGradeList;
  // The worksheet's own auto-extracted grade must always be selectable, even if
  // it falls outside the teacher's configured teaching grades — restricting the
  // list to only "grades this teacher teaches" was silently hiding the real
  // extracted grade (e.g. a Grade 4 worksheet) and defaulting to gradeOptions[0]
  // instead, which showed the WRONG grade with no way to pick the right one.
  const gradeOptions = (grade && !baseGradeOptions.includes(grade))
    ? [...baseGradeOptions, grade]
    : baseGradeOptions;
  // Render-derived selected grade — always a valid option even if `grade` state is
  // momentarily stale, so a pill is always highlighted (no effect-timing gaps).
  const effectiveGrade = gradeOptions.includes(grade) ? grade : (gradeOptions[0] || grade);

  // Curricula this teacher handles (selectable when they teach more than one).
  const teachesCurricula = Array.isArray(user?.teaches) && user.teaches.length > 0
    ? ([...new Set(user.teaches.map((t: any) => t.curriculum).filter(Boolean))] as string[])
    : [];
  const baseCurriculumOptions = fetchedCurricula.length > 0
    ? fetchedCurricula
    : (teachesCurricula.length > 0 ? teachesCurricula : (teacherCurriculum ? [teacherCurriculum] : []));
  // Same fix as gradeOptions above — the worksheet's own extracted curriculum
  // must always be selectable, never silently overridden by a restricted list.
  const curriculumOptions = (curriculum && !baseCurriculumOptions.includes(curriculum))
    ? [...baseCurriculumOptions, curriculum]
    : baseCurriculumOptions;
  const effectiveCurriculum = curriculumOptions.includes(curriculum)
    ? curriculum
    : (curriculumOptions[0] || curriculum);

  // Fetch the teacher's grades + curricula authoritatively from their saved
  // preferences. Runs on every focus (not just mount) so a change in Settings is
  // picked up instantly when the teacher returns — no manual refresh needed.
  useFocusEffect(useCallback(() => {
    if (!teacherEmail) return;
    fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(teacherEmail)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        const teaches = Array.isArray(p?.teaches) ? p.teaches : [];
        const g = [...new Set(teaches.map((t: any) => t.grade).filter(Boolean))] as string[];
        const c = [...new Set(teaches.map((t: any) => t.curriculum).filter(Boolean))] as string[];
        // Only populate the option list here — do NOT force-reset grade/curriculum
        // to the teacher's default. This effect used to unconditionally stomp
        // grade/curriculum back to the teacher's own teaching list on every
        // screen focus, silently overwriting a worksheet's correctly auto-filled
        // grade (e.g. Grade 4) just because that teacher normally teaches
        // Grade 3/5 — the worksheet's real extracted grade must never be
        // silently overridden like that.
        if (g.length > 0) setFetchedGrades(g);
        if (c.length > 0) setFetchedCurricula(c);
      })
      .catch(() => {});
  }, [teacherEmail]));

  // Keep `grade`/`curriculum` state in sync with the clamped effective values so the
  // publish payload and AI-generate calls always use grades/curricula the teacher teaches.
  // Keep grade/curriculum synced to their clamped effective values — adjusted
  // during render (React's documented "adjusting state when a prop changes"
  // pattern) instead of an effect.
  const [prevEffectiveGrade, setPrevEffectiveGrade] = useState(effectiveGrade);
  if (prevEffectiveGrade !== effectiveGrade) {
    setPrevEffectiveGrade(effectiveGrade);
    if (grade !== effectiveGrade) setGrade(effectiveGrade);
  }
  const [prevEffectiveCurriculum, setPrevEffectiveCurriculum] = useState(effectiveCurriculum);
  if (prevEffectiveCurriculum !== effectiveCurriculum) {
    setPrevEffectiveCurriculum(effectiveCurriculum);
    if (effectiveCurriculum && curriculum !== effectiveCurriculum) setCurriculum(effectiveCurriculum);
  }

  // Fetch the syllabus topics available for the selected grade + subject so the
  // teacher can pick from what the curriculum actually covers (or type their own).
  useEffect(() => {
    let cancelled = false;
    if (!subject || !effectiveGrade) {
      // reset when there's nothing to fetch — the effect also owns the fetch
      // path below, so this stays as one effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailableTopics([]);
      return;
    }
    setTopicsLoading(true);
    fetch(`${ASSIGNMENTS_SERVER_URL}/curriculum/subjects?grade=${encodeURIComponent(effectiveGrade)}&curriculum=${encodeURIComponent(effectiveCurriculum)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const match = (data?.subjects || []).find((s: any) => s.subject === subject);
        const topics = (match?.topics || [])
          .map((t: any) => String(t.topic || '').trim())
          .filter(Boolean);
        setAvailableTopics(Array.from(new Set(topics)) as string[]);
      })
      .catch(() => { if (!cancelled) setAvailableTopics([]); })
      .finally(() => { if (!cancelled) setTopicsLoading(false); });
    return () => { cancelled = true; };
  }, [subject, effectiveGrade, effectiveCurriculum]);

  return {
    teacherCurriculum, defaultGrade,
    grade, setGrade, curriculum, setCurriculum,
    isIBPYP, teacherEmail,
    gradeOptions, effectiveGrade,
    curriculumOptions, effectiveCurriculum, teacherCurricula: baseCurriculumOptions,
    availableTopics, topicsLoading,
  };
}
