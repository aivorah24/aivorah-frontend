import { useCallback, useMemo, useState } from 'react';
import { fetchChartsData, fetchPlatformOverview } from '../services/platformAdminOverviewService';
import type { ChartsData, PlatformOverview, SchoolDrilldownRow } from '../types';

export function usePlatformOverview() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The charts breakdown is a secondary, non-blocking call — if it fails,
  // the core overview (KPIs, school drill-down) still renders.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchPlatformOverview());
    } catch (e: any) {
      setError(e?.message || 'Could not load the overview. Check your connection.');
    } finally {
      setLoading(false);
    }
    try {
      setCharts(await fetchChartsData());
    } catch {
      // charts section just stays empty — not worth surfacing a second error banner
    }
  }, []);

  // B2B = has a school on file; B2C = parent-enrolled, no school — same
  // definition the original admin-panel.html used.
  const b2bStudents = useMemo(() => (data?.students || []).filter((s) => !!s.school), [data]);
  const b2cStudents = useMemo(() => (data?.students || []).filter((s) => !s.school), [data]);
  const schoolCount = useMemo(() => new Set(b2bStudents.map((s) => s.school)).size, [b2bStudents]);
  const b2bSharePct = data?.counts.students ? Math.round((b2bStudents.length / data.counts.students) * 100) : 0;

  const onboardingRatePct = data?.counts.students
    ? Math.round(((data.students.filter((s) => s.onboardingComplete).length) / data.counts.students) * 100)
    : 0;
  const avgStreak = data?.students.length
    ? Math.round(data.students.reduce((sum, s) => sum + (s.currentStreak || 0), 0) / data.students.length)
    : 0;

  // Most recently active students — the "Last Seen" table's source, derived
  // from student_stats.updated_at (no separate analytics endpoint needed).
  const lastSeenStudents = useMemo(() => {
    return (data?.students || [])
      .filter((s) => !!s.lastSeen)
      .slice()
      .sort((a, b) => new Date(b.lastSeen as string).getTime() - new Date(a.lastSeen as string).getTime())
      .slice(0, 10);
  }, [data]);

  const schoolDrilldown: SchoolDrilldownRow[] = useMemo(() => {
    if (!data) return [];
    const byName = new Map<string, { students: number; teachers: Set<string>; totalXP: number }>();
    for (const s of b2bStudents) {
      const row = byName.get(s.school) || { students: 0, teachers: new Set<string>(), totalXP: 0 };
      row.students += 1;
      row.totalXP += s.xpPoints;
      byName.set(s.school, row);
    }
    for (const t of data.teachers) {
      if (!t.school) continue;
      const row = byName.get(t.school);
      if (row) row.teachers.add(t.id);
    }
    return [...byName.entries()]
      .map(([school, r]) => ({
        school, students: r.students, teachers: r.teachers.size,
        totalXP: r.totalXP, avgXP: r.students ? Math.round(r.totalXP / r.students) : 0,
      }))
      .sort((a, b) => b.students - a.students);
  }, [data, b2bStudents]);

  return {
    data, charts, loading, error, load,
    b2bStudents, b2cStudents, schoolCount, b2bSharePct, schoolDrilldown,
    onboardingRatePct, avgStreak, lastSeenStudents,
  };
}
