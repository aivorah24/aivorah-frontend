import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchClassAttendance, saveClassAttendance,
  type AttendanceClass, type AttendanceStatus, type RosterStudent,
} from '../../../../services/attendanceClient';
import { isValidISODate, recordsOf, toggleStatus } from '../utils/attendanceUtils';

export type SaveMessage = { kind: 'success' | 'error'; text: string } | null;

// Roster + marks for one class on one day; saving shows an inline message (Alert is invisible on web).
export function useClassAttendance(selected: AttendanceClass | null, date: string) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const [previous, setPrevious] = useState<Record<string, AttendanceStatus | null> | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!selected || !isValidISODate(date)) return;
    const mine = ++seq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchClassAttendance(selected.grade, selected.section, date);
      if (mine === seq.current) setStudents(list);
    } catch (e: any) {
      if (mine === seq.current) { setStudents([]); setLoadError(e?.message || 'Could not load attendance'); }
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [selected, date]);

  useEffect(() => {
    // data fetching effect — clear the previous class/day's message, then load this one
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(null);
    setPrevious(null);
    load();
  }, [load]);

  const mark = (id: string, status: AttendanceStatus) => {
    setMessage(null);
    setStudents((prev) => toggleStatus(prev, id, status));
  };

  // Second tap restores what was there before "Mark All Present".
  const markAllPresent = () => {
    setMessage(null);
    if (students.length > 0 && students.every((s) => s.status === 'present')) {
      setStudents((prev) => prev.map((s) => ({ ...s, status: previous?.[s.id] ?? null })));
      setPrevious(null);
    } else {
      setPrevious(Object.fromEntries(students.map((s) => [s.id, s.status])));
      setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveClassAttendance({ grade: selected.grade, section: selected.section, date, records: recordsOf(students) });
      setMessage({ kind: 'success', text: `Saved attendance for ${date}` });
      await load();
    } catch (e: any) {
      setMessage({ kind: 'error', text: e?.message || 'Could not save attendance' });
    } finally {
      setSaving(false);
    }
  };

  return { students, loading, loadError, saving, message, mark, markAllPresent, save, reload: load };
}
