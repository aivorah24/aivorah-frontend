import { useState, useCallback, useMemo } from 'react';
import { schoolAdminClassesService, ClassRow, TeacherOption } from '../services/schoolAdminClassesService';
import { sortGradeOptions, filterAndSortClasses, rankPickerTeachers } from '../utils/classesSorting';

interface ToastFn {
  (opts: { title: string; subtitle: string; type: 'success' }): void;
}

// List + assign-picker state for the Classes screen — mirrors the legacy
// SchoolAdminClassesScreen.tsx's state and behavior exactly (see
// docs comment on assignTeacher below for one deliberately-preserved quirk).
export function useClassesState(userEmail: string | undefined | null, showToast: ToastFn) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [pickerFor, setPickerFor] = useState<ClassRow | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerError, setPickerError] = useState('');

  const load = useCallback(async () => {
    if (!userEmail) return;
    setError('');
    try {
      const classesData = await schoolAdminClassesService.getClasses(userEmail);
      setClasses(classesData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load classes. Check your connection.');
      setLoading(false);
      return;
    }
    // Teacher-list failures are never surfaced here — matches the legacy
    // screen's behavior exactly, which only ever checked classesRes.ok and
    // silently fell back to an empty teacher list on any teachers-fetch
    // problem. Preserved as-is rather than fixed during this refactor
    // (flagged separately, not a silent behavior change).
    try {
      const teachersData = await schoolAdminClassesService.getTeachers(userEmail);
      setTeachers(teachersData);
    } catch {
      setTeachers([]);
    }
    setLoading(false);
  }, [userEmail]);

  const gradeOptions = useMemo(() => sortGradeOptions(classes), [classes]);
  const visibleClasses = useMemo(() => filterAndSortClasses(classes, gradeFilter), [classes, gradeFilter]);
  const pickerTeachers = useMemo(() => rankPickerTeachers(teachers, pickerFor, pickerSearch), [teachers, pickerFor, pickerSearch]);

  function openPicker(cls: ClassRow) {
    setPickerFor(cls);
    setPickerSearch('');
    setPickerError('');
  }

  function closePicker() {
    setPickerFor(null);
  }

  async function assignTeacher(teacherEmail: string | null) {
    if (!userEmail || !pickerFor) return;
    setPickerBusy(true);
    setPickerError('');
    try {
      await schoolAdminClassesService.assignClassTeacher(pickerFor.grade, pickerFor.section, userEmail, teacherEmail);
      const assignedTo = pickerFor;
      setPickerFor(null);
      await load();
      showToast({
        title: teacherEmail ? 'Class teacher assigned' : 'Class teacher removed',
        subtitle: `${assignedTo.grade} · Section ${assignedTo.section}`,
        type: 'success',
      });
    } catch (err: any) {
      setPickerError(err?.message || 'Failed to assign class teacher. Check your connection.');
    } finally {
      setPickerBusy(false);
    }
  }

  return {
    classes, teachers, loading, error, gradeFilter, setGradeFilter, filterOpen, setFilterOpen,
    gradeOptions, visibleClasses,
    pickerFor, pickerSearch, setPickerSearch, pickerBusy, pickerError, pickerTeachers,
    load, openPicker, closePicker, assignTeacher,
    setLoading,
  };
}
