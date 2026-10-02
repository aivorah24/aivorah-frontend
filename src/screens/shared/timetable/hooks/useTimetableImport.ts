import { useState } from 'react';
import { Platform } from 'react-native';
import {
  commitTimetableImport, previewTimetableImport, ImportedClass, ImportResult, TimetableClass,
} from '../services/timetableApi';

export type ImportStep = 'pick' | 'reading' | 'review' | 'saving' | 'done';
export interface ImportRow extends ImportedClass { include: boolean; target: TimetableClass | null }

const MAX_BYTES = 10 * 1024 * 1024;
const sameClass = (a: { grade: string; section: string }, b: { grade: string; section: string }) =>
  a.grade === b.grade && a.section === b.section;

// targets: the classes this user may replace (all classes for admins, homeroom classes for teachers).
export function useTimetableImport(targets: TimetableClass[], onSaved: () => void) {
  const [step, setStep] = useState<ImportStep>('pick');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState('');

  const reset = () => { setStep('pick'); setFileName(''); setRows([]); setResults([]); setError(''); };

  const readFile = async (file: Blob, name: string) => {
    if (file.size > MAX_BYTES) { setError('The PDF must be under 10 MB.'); return; }
    setError(''); setFileName(name); setStep('reading');
    try {
      const { classes } = await previewTimetableImport(file, name);
      setRows(classes.map((c) => {
        const target = c.match ? targets.find((t) => sameClass(t, c.match!)) || null : null;
        return { ...c, target, include: !!target && c.canSave && c.periodDefs.length > 0 };
      }));
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'Could not read the timetable PDF');
      setStep('pick');
    }
  };

  // Web file picker (same approach as the Resources upload).
  const pickFile = () => {
    if (Platform.OS !== 'web') { setError('Please import timetables from the web app.'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = () => { const f = input.files?.[0]; if (f) readFile(f, f.name); };
    input.click();
  };

  const setTarget = (i: number, target: TimetableClass | null) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, target, include: !!target && row.periodDefs.length > 0 } : row)));
  const toggle = (i: number) =>
    setRows((r) => r.map((row, idx) => (idx === i && row.target ? { ...row, include: !row.include } : row)));

  const chosen = rows.filter((r) => r.include && r.target);
  const duplicateTargets = chosen.length !== new Set(chosen.map((r) => `${r.target!.grade}|${r.target!.section}`)).size;

  const save = async () => {
    if (!chosen.length || duplicateTargets) return;
    setStep('saving'); setError('');
    try {
      const res = await commitTimetableImport(chosen.map((r) => ({
        grade: r.target!.grade, section: r.target!.section, periodDefs: r.periodDefs, slots: r.slots,
      })));
      setResults(res.results);
      setStep('done');
      if (res.saved > 0) onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save the timetables');
      setStep('review');
    }
  };

  return { step, fileName, rows, results, error, chosen, duplicateTargets, pickFile, readFile, setTarget, toggle, save, reset };
}
