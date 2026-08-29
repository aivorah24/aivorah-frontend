import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStudentProgressHeatmap } from '../services/studentProgressService';
import { filterByClass, normalizeGrade, type ClassFilters } from '../utils/rosterFilters';
import type { HeatmapData } from '../types';

const EMPTY: HeatmapData = { students: [], topics: [] };

// A single unfiltered fetch, all filtering done client-side below. This
// keeps Curriculum/Grade/Subject/Class/Section as one shared filter state
// (single source of truth) so Topic Exploration, the Subject Progress
// summary, and Activity & Performance can never show mutually inconsistent
// populations — and it sidesteps the heatmap route's missing curriculum
// query param, which alone can't disambiguate a teacher handling the same
// grade under two curricula.
export function useStudentProgress(teacherEmail: string | undefined) {
  const [data, setData] = useState<HeatmapData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [filters, setFilters] = useState<ClassFilters>({});

  const load = useCallback(async (isRefresh = false) => {
    if (!teacherEmail) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const result = await fetchStudentProgressHeatmap(teacherEmail, {});
      setData(result && Array.isArray(result.students) ? result : EMPTY);
      setLastRefreshedAt(Date.now());
    } catch {
      setError(true);
      setData(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teacherEmail]);

  useEffect(() => {
    // data-fetching effect — setState happens inside load(), not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Default every filter to the teacher's first real, cascading value
  // (Curriculum -> Grade -> Subject -> Class -> Section) as soon as the
  // real data first loads — never a generic "All" default. Runs exactly
  // once, on the first successful load with real students; a manual change
  // afterward (including selecting "All" explicitly) is never overwritten,
  // and a later refresh doesn't re-run this.
  const hasDefaultedRef = useRef(false);
  useEffect(() => {
    if (hasDefaultedRef.current || data.students.length === 0) return;
    hasDefaultedRef.current = true;
    const curriculum = data.students.map((s) => s.curriculum).find((c): c is string => !!c);
    const gradeCandidates = data.students.filter((s) => !curriculum || s.curriculum === curriculum);
    const grade = gradeCandidates.map((s) => s.grade).find((g): g is string => !!g);
    const subjectCandidates = gradeCandidates.filter((s) => !grade || normalizeGrade(s.grade) === normalizeGrade(grade));
    const subject = subjectCandidates.flatMap((s) => s.scopedSubjects).find(Boolean);
    const cls = subjectCandidates.map((s) => s.class).find((c): c is string => !!c);
    const sectionCandidates = subjectCandidates.filter((s) => !cls || s.class === cls);
    const section = sectionCandidates.map((s) => s.section).find((sec): sec is string => !!sec);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters({ curriculum, grade, subject, class: cls, section });
  }, [data]);

  // Full filters (incl. subject) — drives Topic Exploration.
  const filteredStudents = filterByClass(data.students, filters);
  const topics = filters.subject ? data.topics.filter((t) => t.subject === filters.subject) : data.topics;

  // Grade+Class+Section only (NOT subject) — drives the Subject Progress
  // summary, so every subject the teacher teaches for this class still gets
  // its own card even while one subject is selected up top (spec: "If only
  // one subject is selected, show that subject's progress clearly; if All
  // subjects, show the relevant subject-wise summaries").
  const { subject: _subjectFilter, ...classOnlyFilters } = filters;
  const summaryStudents = filterByClass(data.students, classOnlyFilters);
  const summaryTopics = data.topics;

  // Curriculum, Grade, Subject, Class, Section — each dropdown's option
  // list is scoped to only what's actually selected in the dropdowns before
  // it (cascading/dependent filters), so a teacher can never pick a
  // combination with zero real students behind it.
  const availableCurricula = Array.from(
    new Set(data.students.map((s) => s.curriculum).filter((c): c is string => !!c))
  ).sort();
  const availableGrades = Array.from(
    new Set(
      data.students
        .filter((s) => !filters.curriculum || s.curriculum === filters.curriculum)
        .map((s) => s.grade)
        .filter((g): g is string => !!g)
    )
  ).sort();
  const availableSubjects = Array.from(
    new Set(
      data.students
        .filter((s) => (!filters.curriculum || s.curriculum === filters.curriculum) && (!filters.grade || normalizeGrade(s.grade) === normalizeGrade(filters.grade)))
        .flatMap((s) => s.scopedSubjects)
        .filter(Boolean)
    )
  ).sort();
  const availableClasses = Array.from(
    new Set(
      data.students
        .filter((s) => (!filters.grade || normalizeGrade(s.grade) === normalizeGrade(filters.grade)) && (!filters.curriculum || s.curriculum === filters.curriculum))
        .map((s) => s.class)
        .filter((c): c is string => !!c)
    )
  ).sort();
  const availableSections = Array.from(
    new Set(
      data.students
        .filter((s) => (!filters.grade || normalizeGrade(s.grade) === normalizeGrade(filters.grade)) && (!filters.curriculum || s.curriculum === filters.curriculum) && (!filters.class || s.class === filters.class))
        .map((s) => s.section)
        .filter((sec): sec is string => !!sec)
    )
  ).sort();

  return {
    students: filteredStudents, topics,
    summaryStudents, summaryTopics,
    loading, refreshing, error, lastRefreshedAt,
    filters, setFilters,
    availableSubjects, availableGrades, availableCurricula, availableClasses, availableSections,
    refresh: () => load(true),
  };
}
