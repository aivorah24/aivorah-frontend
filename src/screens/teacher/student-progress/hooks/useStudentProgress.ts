import { useCallback, useEffect, useState } from 'react';
import { fetchStudentProgressHeatmap } from '../services/studentProgressService';
import { filterByClass, type ClassFilters } from '../utils/rosterFilters';
import type { HeatmapData } from '../types';

const EMPTY: HeatmapData = { students: [], topics: [] };

// A single unfiltered fetch, all filtering done client-side below. This
// replaced a server-refetch-per-filter-change design because the heatmap
// route only accepts ?subject=/?grade= (no curriculum) — insufficient for
// the reported edge case of a teacher handling the same grade under two
// curricula (e.g. Grade 3 IB + Grade 4 CBSE), which needs grade+curriculum
// applied together to disambiguate the right roster.
export function useStudentProgress(teacherEmail: string | undefined) {
  const [data, setData] = useState<HeatmapData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<ClassFilters>({});

  const load = useCallback(async (isRefresh = false) => {
    if (!teacherEmail) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const result = await fetchStudentProgressHeatmap(teacherEmail, {});
      setData(result && Array.isArray(result.students) ? result : EMPTY);
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

  const filteredStudents = filterByClass(data.students, filters);
  // Topics list is scoped to the same subject filter, so the heatmap's
  // column headers match the students actually shown in its rows.
  const topics = filters.subject ? data.topics.filter((t) => t.subject === filters.subject) : data.topics;

  const availableSubjects = Array.from(
    new Set(data.topics.map((t) => t.subject).filter((s): s is string => !!s))
  ).sort();
  const availableGrades = Array.from(
    new Set(data.students.map((s) => s.grade).filter((g): g is string => !!g))
  ).sort();
  const availableSections = Array.from(
    new Set(
      data.students
        .filter((s) => (!filters.grade || s.grade === filters.grade) && (!filters.curriculum || s.curriculum === filters.curriculum))
        .map((s) => s.section)
        .filter((sec): sec is string => !!sec)
    )
  ).sort();

  return {
    students: filteredStudents, topics,
    loading, refreshing, error,
    filters, setFilters,
    availableSubjects, availableGrades, availableSections,
    refresh: () => load(true),
  };
}
