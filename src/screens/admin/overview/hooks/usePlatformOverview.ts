import { useCallback, useMemo, useState } from 'react';
import { fetchPlatformOverview } from '../services/platformAdminOverviewService';
import type { PlatformOverview, SchoolDrilldownRow } from '../types';

export function usePlatformOverview() {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, []);

  // B2B = has a school on file; B2C = parent-enrolled, no school — same
  // definition the original admin-panel.html used.
  const b2bStudents = useMemo(() => (data?.students || []).filter((s) => !!s.school), [data]);
  const b2cStudents = useMemo(() => (data?.students || []).filter((s) => !s.school), [data]);
  const schoolCount = useMemo(() => new Set(b2bStudents.map((s) => s.school)).size, [b2bStudents]);
  const b2bSharePct = data?.counts.students ? Math.round((b2bStudents.length / data.counts.students) * 100) : 0;

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
    data, loading, error, load,
    b2bStudents, b2cStudents, schoolCount, b2bSharePct, schoolDrilldown,
  };
}
