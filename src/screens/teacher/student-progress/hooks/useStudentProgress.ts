import { useCallback, useEffect, useState } from 'react';
import { fetchStudentProgressHeatmap } from '../services/studentProgressService';
import type { HeatmapData } from '../types';

const EMPTY: HeatmapData = { students: [], topics: [] };

export function useStudentProgress(teacherEmail: string | undefined) {
  const [data, setData] = useState<HeatmapData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string | undefined>(undefined);
  const [gradeFilter, setGradeFilter] = useState<string | undefined>(undefined);
  // Reported bug: tapping "Grade 3" made "Grade 4" vanish from the filter
  // pills entirely, forcing a trip back through "All" to reach it. RCA: the
  // available options were derived from `data`, which IS the filtered
  // response — so filtering to Grade 3 collapsed the option list to just
  // Grade 3. `baseline` is fetched once, unfiltered, purely to populate the
  // filter pills — it never changes when subjectFilter/gradeFilter change.
  const [baseline, setBaseline] = useState<HeatmapData>(EMPTY);

  const load = useCallback(async (isRefresh = false) => {
    if (!teacherEmail) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const result = await fetchStudentProgressHeatmap(teacherEmail, { subject: subjectFilter, grade: gradeFilter });
      setData(result && Array.isArray(result.students) ? result : EMPTY);
    } catch {
      setError(true);
      setData(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teacherEmail, subjectFilter, gradeFilter]);

  const loadBaseline = useCallback(async () => {
    if (!teacherEmail) return;
    try {
      const result = await fetchStudentProgressHeatmap(teacherEmail, {});
      setBaseline(result && Array.isArray(result.students) ? result : EMPTY);
    } catch {
      // Filter pills just stay empty on a baseline-fetch failure — the main
      // `load()` above is what surfaces the real error state to the user.
    }
  }, [teacherEmail]);

  useEffect(() => {
    // data-fetching effect — setState happens inside load(), not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBaseline();
  }, [loadBaseline]);

  // Real subject/grade options derived from the UNFILTERED baseline, so
  // selecting one filter never removes the others from the option list.
  const availableSubjects = Array.from(
    new Set(baseline.topics.map((t) => t.subject).filter((s): s is string => !!s))
  ).sort();
  const availableGrades = Array.from(
    new Set(baseline.students.map((s) => s.grade).filter((g): g is string => !!g))
  ).sort();

  return {
    students: data.students, topics: data.topics,
    loading, refreshing, error,
    subjectFilter, setSubjectFilter, gradeFilter, setGradeFilter,
    availableSubjects, availableGrades,
    refresh: () => { load(true); loadBaseline(); },
  };
}
