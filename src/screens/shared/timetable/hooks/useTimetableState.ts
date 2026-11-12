import { useCallback, useEffect, useState } from 'react';
import { readScreenCache, writeScreenCache } from '../../../../utils/screenCache';
import { Platform } from 'react-native';
import {
  fetchClasses, fetchTimetable, fetchMyTimetable, fetchSchoolTeachers, saveSlot, saveTemplate,
  Timetable, TimetableClass, PeriodDef, TimetableSlot, SchoolTeacher,
} from '../services/timetableApi';
import { downloadTimetablePdf } from '../utils/timetablePdf';
import {
  programmeForGrade, computeProgrammes,
  computeGradesForSelector, computeSectionsForGrade, StructureGrade,
} from '../utils/timetableProgramme';
import { SlotEdit } from '../components/SlotDetailModal';

// A full school-day bell structure (8:25 AM - 3:00 PM) for template owners to
// start from — mirrors a real IB day: a mid-morning break and a clearly-marked
// Lunch break (both rendered as full-width break strips with their times).
export const DEFAULT_PERIODS: PeriodDef[] = [
  { code: 'P0', start: '08:25', end: '08:50', isBreak: false },
  { code: 'P1', start: '08:50', end: '09:40', isBreak: false },
  { code: 'P2', start: '09:40', end: '10:30', isBreak: false },
  { code: 'BRK', start: '10:30', end: '10:40', isBreak: true },
  { code: 'P3', start: '10:40', end: '11:30', isBreak: false },
  { code: 'P4', start: '11:30', end: '12:20', isBreak: false },
  { code: 'LUNCH', start: '12:20', end: '12:50', isBreak: true },
  { code: 'P5', start: '12:50', end: '13:40', isBreak: false },
  { code: 'P6', start: '13:40', end: '14:10', isBreak: false },
  { code: 'P7', start: '14:10', end: '15:00', isBreak: false },
];

interface UseTimetableStateParams {
  role: string | undefined;
  school: string | undefined;
  userName: string | undefined;
  paramClass: TimetableClass | null;
}

const classOf = (grade: string, section: string): TimetableClass => ({ grade, section, label: `${grade}${section ? ' ' + section : ''}` });
const sameClass = (a: TimetableClass | null, b: TimetableClass | null) => !!a && !!b && a.grade === b.grade && a.section === b.section;

// Teachers see two views: their own week across every class they teach, and
// their homeroom class's timetable (the class a school admin assigned them).
export type TeacherView = 'mine' | 'homeroom';

// State + handlers for TimetableScreen. Classes, the school and permissions
// all come from the signed-in user on the server.
export function useTimetableState({ role, school, userName, paramClass }: UseTimetableStateParams) {
  // Last classes / timetable this user saw: shown instantly while fresh data loads.
  const userKey = `${role}:${school || ''}:${userName || ''}`;
  const [classes, setClasses] = useState<TimetableClass[]>(paramClass ? [paramClass] : []);
  const [selected, setSelected] = useState<TimetableClass | null>(paramClass);
  const [tt, setTt] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ day: string; period: PeriodDef; slot: TimetableSlot | null } | null>(null);
  const [showPeriods, setShowPeriods] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // For the admin Programme → Grade → Section selector (IB schools).
  const [structure, setStructure] = useState<StructureGrade[]>([]);
  const [curriculum, setCurriculum] = useState<string | null>(null);
  const [programme, setProgramme] = useState<string | null>(null);

  const isAdmin = role === 'school_admin' || role === 'super_admin';
  // Opened for one class (e.g. from Class Detail) keeps the single-class view.
  const teacherViews = role === 'teacher' && !paramClass;
  const [view, setView] = useState<TeacherView>('mine');
  const [myTt, setMyTt] = useState<Timetable | null>(null);
  const [mineLoading, setMineLoading] = useState(true);
  const [mineError, setMineError] = useState('');
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);

  const loadClasses = useCallback(async () => {
    if (paramClass) return; // opened for one class: no picker
    const classesKey = `timetable:classes:${userKey}`;
    const cachedClasses = readScreenCache<Awaited<ReturnType<typeof fetchClasses>>>(classesKey);
    try {
      if (cachedClasses) applyClasses(cachedClasses);
      const data = await fetchClasses();
      writeScreenCache(classesKey, data);
      applyClasses(data);
    } catch (e: any) {
      if (cachedClasses) return; // keep showing the last classes
      setError(e?.message || 'Failed to load classes');
      setLoading(false);
    }

    function applyClasses(data: Awaited<ReturnType<typeof fetchClasses>>) {
      setClasses(data.classes);
      setStructure(data.grades);
      setCurriculum(data.curriculum);
      let resolved: TimetableClass | null = null;
      if (teacherViews) {
        // Only the teacher's own homeroom class(es), never another class.
        const homerooms = data.classes.filter((c) => c.homeroom);
        setSelected((prev) => { resolved = homerooms.find((c) => sameClass(c, prev)) || homerooms[0] || null; return resolved; });
      } else {
        setSelected((prev) => { resolved = prev || data.classes[0] || null; return resolved; });
      }
      // loadTimetable clears the spinner; with no class it never runs.
      if (!resolved) setLoading(false);
    }
  }, [paramClass, teacherViews, userKey]);

  const loadMine = useCallback(async () => {
    const key = `timetable:mine:${userKey}`;
    const cached = readScreenCache<Timetable>(key);
    if (cached) setMyTt(cached);
    setMineLoading(!cached); setMineError('');
    try {
      const fresh = await fetchMyTimetable();
      writeScreenCache(key, fresh);
      setMyTt(fresh);
    } catch (e: any) {
      if (!cached) {
        setMineError(e?.message || 'Failed to load your timetable');
        setMyTt(null);
      }
    } finally {
      setMineLoading(false);
    }
  }, [userKey]);

  const loadTimetable = useCallback(async (cls: TimetableClass) => {
    if (!cls) return;
    const key = `timetable:class:${userKey}:${cls.grade}:${cls.section}`;
    const cached = readScreenCache<Timetable>(key);
    if (cached) setTt(cached);
    setLoading(!cached); setError('');
    try {
      const fresh = await fetchTimetable(cls.grade, cls.section);
      writeScreenCache(key, fresh);
      setTt(fresh);
    } catch (e: any) {
      if (!cached) {
        setError(e?.message || 'Failed to load timetable');
        setTt(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  const isMineView = teacherViews && view === 'mine';
  const homeroomClasses = classes.filter((c) => c.homeroom);
  // What the screen shows: the teacher's own week, or the selected class.
  const shownTt = isMineView ? myTt : tt;
  const shownLoading = isMineView ? mineLoading : loading;
  const shownError = isMineView ? mineError : error;
  const classLabel = isMineView ? 'My Timetable' : selected ? selected.label : 'Timetable';

  // School's teachers for the "who takes this period" picker, once someone may choose.
  const canAssignTeacher = !isMineView && !!tt?.permissions.canAssignTeacher;
  useEffect(() => {
    if (!canAssignTeacher || teachers.length > 0) return;
    fetchSchoolTeachers().then(setTeachers).catch(() => {});
  }, [canAssignTeacher, teachers.length]);

  const isIB = curriculum === 'IB';
  const programmes = computeProgrammes(structure, isIB);
  const activeProgramme = programme || (selected ? programmeForGrade(selected.grade, isIB) : null) || programmes[0] || null;
  const gradesForSelector = computeGradesForSelector(structure, isIB, activeProgramme);
  const sectionsForGrade = computeSectionsForGrade(structure, selected ? selected.grade : null);

  const pickGrade = (gradeName: string) => {
    const g = structure.find((x) => x.name === gradeName);
    const sec = (g?.sections && g.sections[0]) || '';
    setSelected(classOf(gradeName, sec));
  };
  const pickSection = (sec: string) => {
    if (!selected) return;
    setSelected(classOf(selected.grade, sec));
  };
  const pickProgramme = (p: string) => {
    setProgramme(p);
    const firstGrade = structure.find((g) => programmeForGrade(g.name, isIB) === p);
    if (firstGrade) pickGrade(firstGrade.name);
  };

  const setupDefault = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveTemplate({ grade: selected.grade, section: selected.section, title: `${selected.label} Timetable`, periodDefs: DEFAULT_PERIODS });
      await loadTimetable(selected);
    } catch (e: any) { setError(e?.message || 'Failed to set up periods'); }
    finally { setSaving(false); }
  };

  const onSaveSlot = async (edit: SlotEdit) => {
    if (!modal || !selected) return;
    setSaving(true);
    try {
      await saveSlot({
        grade: selected.grade, section: selected.section, day: modal.day, periodCode: modal.period.code,
        subject: edit.subject, room: edit.room, materialUrl: edit.materialUrl, materialName: edit.materialName, color: edit.color,
        ...(edit.teacherId !== undefined ? { teacherId: edit.teacherId } : {}),
      });
      await loadTimetable(selected);
      setModal(null);
    } catch (e: any) { setError(e?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const onSavePeriods = async (periods: PeriodDef[]) => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveTemplate({ grade: selected.grade, section: selected.section, title: `${selected.label} Timetable`, periodDefs: periods });
      await loadTimetable(selected);
      setShowPeriods(false);
    } catch (e: any) { setError(e?.message || 'Failed to save periods'); }
    finally { setSaving(false); }
  };

  const onClearSlot = async () => {
    if (!modal || !selected) return;
    setSaving(true);
    try {
      await saveSlot({ grade: selected.grade, section: selected.section, day: modal.day, periodCode: modal.period.code, subject: '' });
      await loadTimetable(selected);
      setModal(null);
    } catch (e: any) { setError(e?.message || 'Failed to clear'); }
    finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    if (Platform.OS !== 'web' || !shownTt || (!selected && !isMineView)) return;
    setDownloading(true);
    const schoolName = school || 'The Shri Ram Academy';
    const studentSubtitle = isMineView
      ? `${userName ? `${userName}'s` : 'My'} Timetable`
      : userName ? `${userName}'s Timetable (${classLabel})` : `${classLabel} — Timetable`;
    try {
      await downloadTimetablePdf({ tt: shownTt, classLabel, schoolName, studentSubtitle });
    } finally {
      setDownloading(false);
    }
  };

  return {
    classes, selected, setSelected, tt, loading, error, modal, setModal, showPeriods, setShowPeriods,
    saving, downloading, refreshing, setRefreshing, structure, curriculum, programme, isAdmin, isIB,
    classLabel, programmes, activeProgramme, gradesForSelector, sectionsForGrade,
    loadClasses, loadTimetable, setupDefault, onSaveSlot, onSavePeriods, onClearSlot, downloadPdf,
    pickGrade, pickSection, pickProgramme,
    teacherViews, view, setView, isMineView, homeroomClasses, loadMine,
    shownTt, shownLoading, shownError, teachers, canAssignTeacher,
  };
}
