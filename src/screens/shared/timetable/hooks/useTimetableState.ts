import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import SERVER_URL from '../../../../config/serverUrl';
import { fetchMyClasses, MyClass } from '../../../../features/classes/api/classesApi';
import { fetchTimetable, saveSlot, saveTemplate, Timetable, PeriodDef, TimetableSlot } from '../services/timetableApi';
import { downloadTimetablePdf } from '../utils/timetablePdf';
import {
  programmeForGrade, computeProgrammes, computeActiveProgramme,
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
  email: string;
  schoolId: string;
  role: string | undefined;
  school: string | undefined;
  userName: string | undefined;
  paramClass: MyClass | null;
}

// State + handlers for TimetableScreen — mirrors the previous inline
// component state and behavior exactly (isAdmin check, API calls, and the
// teacher/admin-branch silent-fallback quirks are all preserved verbatim).
export function useTimetableState({ email, schoolId, role, school, userName, paramClass }: UseTimetableStateParams) {
  const [classes, setClasses] = useState<MyClass[]>(paramClass ? [paramClass] : []);
  const [selected, setSelected] = useState<MyClass | null>(paramClass);
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

  const loadClasses = useCallback(async () => {
    if (!email || paramClass) return; // param mode: fixed single class, skip listing
    try {
      if (isAdmin && schoolId) {
        // Admins aren't enrolled in a class — offer every grade+section in the
        // school (from the academic structure) as a selectable class.
        const res = await fetch(`${SERVER_URL}/user/school-structure?schoolId=${encodeURIComponent(schoolId)}`);
        const data = await res.json().catch(() => ({}));
        setStructure(data?.grades || []);
        setCurriculum(data?.curriculum || null);
        const opts: MyClass[] = [];
        for (const g of (data?.grades || [])) {
          const secs = g.sections?.length ? g.sections : [''];
          for (const s of secs) {
            opts.push({ grade: g.name, section: s, label: `${g.name}${s ? ' ' + s : ''}`, code: `${g.name}${s}`, classTeacherEmail: null, classTeacherName: null, studentCount: 0 });
          }
        }
        setClasses(opts);
        let resolvedSelected: MyClass | null = null;
        setSelected((prev) => { resolvedSelected = prev || opts[0] || null; return resolvedSelected; });
        // No class to select means loadTimetable will never run, and it's
        // the only other place that clears the initial loading spinner —
        // without this, a school/admin with no grades stays stuck loading
        // forever instead of showing "No class to show a timetable for."
        if (!resolvedSelected) setLoading(false);
        return;
      }
      const cs = await fetchMyClasses(email);
      setClasses(cs);
      let resolvedSelected: MyClass | null = null;
      setSelected((prev) => { resolvedSelected = prev || cs[0] || null; return resolvedSelected; });
      if (!resolvedSelected) setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to load classes');
      setLoading(false);
    }
  }, [email, paramClass, isAdmin, schoolId]);

  const loadTimetable = useCallback(async (cls: MyClass) => {
    if (!schoolId || !cls) return;
    setLoading(true); setError('');
    try {
      setTt(await fetchTimetable(email, schoolId, cls.grade, cls.section));
    } catch (e: any) {
      setError(e?.message || 'Failed to load timetable');
      setTt(null);
    } finally {
      setLoading(false);
    }
  }, [email, schoolId]);

  const classLabel = selected ? selected.label : 'Timetable';

  const isIB = curriculum === 'IB';
  const programmes = computeProgrammes(structure, isIB);
  const activeProgramme = programme || (selected ? programmeForGrade(selected.grade, isIB) : null) || programmes[0] || null;
  const gradesForSelector = computeGradesForSelector(structure, isIB, activeProgramme);
  const sectionsForGrade = computeSectionsForGrade(structure, selected ? selected.grade : null);

  const pickGrade = (gradeName: string) => {
    const g = structure.find((x) => x.name === gradeName);
    const sec = (g?.sections && g.sections[0]) || '';
    setSelected({ grade: gradeName, section: sec, label: `${gradeName}${sec ? ' ' + sec : ''}`, code: `${gradeName}${sec}`, classTeacherEmail: null, classTeacherName: null, studentCount: 0 });
  };
  const pickSection = (sec: string) => {
    if (!selected) return;
    setSelected({ ...selected, section: sec, label: `${selected.grade}${sec ? ' ' + sec : ''}`, code: `${selected.grade}${sec}` });
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
      await saveTemplate({ email, schoolId, grade: selected.grade, section: selected.section, title: `${selected.label} Timetable`, periodDefs: DEFAULT_PERIODS });
      await loadTimetable(selected);
    } catch (e: any) { setError(e?.message || 'Failed to set up periods'); }
    finally { setSaving(false); }
  };

  const onSaveSlot = async (edit: SlotEdit) => {
    if (!modal || !selected) return;
    setSaving(true);
    try {
      await saveSlot({ email, schoolId, grade: selected.grade, section: selected.section, day: modal.day, periodCode: modal.period.code, subject: edit.subject, room: edit.room, materialUrl: edit.materialUrl, materialName: edit.materialName, color: edit.color });
      await loadTimetable(selected);
      setModal(null);
    } catch (e: any) { setError(e?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const onSavePeriods = async (periods: PeriodDef[]) => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveTemplate({ email, schoolId, grade: selected.grade, section: selected.section, title: `${selected.label} Timetable`, periodDefs: periods });
      await loadTimetable(selected);
      setShowPeriods(false);
    } catch (e: any) { setError(e?.message || 'Failed to save periods'); }
    finally { setSaving(false); }
  };

  const onClearSlot = async () => {
    if (!modal || !selected) return;
    setSaving(true);
    try {
      await saveSlot({ email, schoolId, grade: selected.grade, section: selected.section, day: modal.day, periodCode: modal.period.code, subject: '' });
      await loadTimetable(selected);
      setModal(null);
    } catch (e: any) { setError(e?.message || 'Failed to clear'); }
    finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    if (Platform.OS !== 'web' || !tt || !selected) return;
    setDownloading(true);
    const schoolName = school || 'The Shri Ram Academy';
    const studentSubtitle = userName ? `${userName}'s Timetable (${classLabel})` : `${classLabel} — Timetable`;
    try {
      await downloadTimetablePdf({ tt, classLabel, schoolName, studentSubtitle });
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
  };
}
