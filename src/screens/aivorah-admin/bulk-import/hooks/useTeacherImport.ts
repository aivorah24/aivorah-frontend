import { useCallback, useMemo, useState } from 'react';
import { parseCsv, xlsxToGrid } from '../../../../utils/spreadsheet';
import { useAdminSchools } from '../../shared/useAdminSchools';
import { importTeachers } from '../services/bulkImportService';
import { guessTeacherField, reviewTeacherRows } from '../utils/reviewTeacherRows';
import type { TeacherImportField, TeacherImportResult } from '../types';

const MAX_ROWS = 500;

export function useTeacherImport() {
  const { schools, error: schoolsError, reload: loadSchools, placeholder: schoolPlaceholder } = useAdminSchools();
  const [schoolId, setSchoolId] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<(TeacherImportField | '')[]>([]);
  const [editingColumns, setEditingColumns] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<TeacherImportResult | null>(null);

  const school = useMemo(() => schools.find((s) => s.id === schoolId) || null, [schools, schoolId]);

  const loadGrid = useCallback((grid: string[][], name: string) => {
    setResult(null);
    setSubmitError('');
    const [head = [], ...allRows] = grid;
    const rows = allRows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
    const fail = (msg: string) => { setFileError(msg); setHeaders([]); setDataRows([]); setColumnMap([]); };
    if (!rows.length) return fail('This file has no teacher rows under the header row.');
    if (rows.length > MAX_ROWS) return fail(`This file has ${rows.length} rows — import at most ${MAX_ROWS} at a time.`);
    setFileError('');
    setFileName(name);
    setHeaders(head);
    setDataRows(rows);
    const guessed = head.map(guessTeacherField);
    setColumnMap(guessed.map((f, i) => (f && guessed.indexOf(f) === i ? f : '')));
    setEditingColumns(false);
  }, []);

  const loadFile = useCallback((name: string, content: ArrayBuffer | string) => {
    try {
      loadGrid(typeof content === 'string' ? parseCsv(content) : xlsxToGrid(content), name);
    } catch {
      setFileError("Couldn't read this file. Save it as .xlsx or .csv and try again.");
    }
  }, [loadGrid]);

  function setColumnField(col: number, field: TeacherImportField | '') {
    setColumnMap((prev) => prev.map((f, i) => (i === col ? field : f === field && field ? '' : f)));
  }

  const reviewed = useMemo(() => reviewTeacherRows(dataRows, columnMap), [dataRows, columnMap]);
  const readyRows = reviewed.filter((r) => r.issues.length === 0);
  const blockedRows = reviewed.filter((r) => r.issues.length > 0);
  const nameMapped = columnMap.includes('teacherName');
  const columnsOpen = editingColumns || !nameMapped;

  async function submit() {
    if (!schoolId) { setSubmitError('Choose a school first.'); return; }
    if (!nameMapped) { setSubmitError('Map a column to Teacher Name.'); return; }
    if (!readyRows.length) { setSubmitError('No rows are ready to import.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      setResult(await importTeachers({ schoolId, fileName, rows: readyRows.map((r) => r.values) }));
    } catch (e: any) {
      setSubmitError(e?.message || 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFileName(''); setHeaders([]); setDataRows([]); setColumnMap([]); setEditingColumns(false);
    setFileError(''); setSubmitError(''); setResult(null);
  }

  return {
    schools, schoolsError, loadSchools, schoolPlaceholder, schoolId, setSchoolId, school,
    fileName, headers, columnMap, setColumnField, columnsOpen, setEditingColumns, fileError, loadGrid, loadFile,
    reviewed, readyRows, blockedRows, nameMapped,
    submitting, submitError, result, submit, reset,
  };
}
