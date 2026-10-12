import { useCallback, useMemo, useState } from 'react';
import { guessStudentField, parseCsv, xlsxToGrid, type StudentImportField } from '../../../../utils/spreadsheet';
import { useAdminSchools } from '../../shared/useAdminSchools';
import { importSpreadsheet } from '../services/bulkImportService';
import { reviewRows } from '../utils/reviewRows';
import type { SpreadsheetImportResult } from '../types';

const MAX_ROWS = 500;

export function useSpreadsheetImport() {
  const { schools, error: schoolsError, reload: loadSchools, placeholder: schoolPlaceholder } = useAdminSchools();
  const [schoolId, setSchoolId] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<(StudentImportField | '')[]>([]);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<SpreadsheetImportResult | null>(null);

  const school = useMemo(() => schools.find((s) => s.id === schoolId) || null, [schools, schoolId]);

  // Grid = header row + data rows, from either an .xlsx/.xls or a .csv file.
  const loadGrid = useCallback((grid: string[][], name: string) => {
    setResult(null);
    setSubmitError('');
    if (grid.length < 2) {
      setFileError('This file has no student rows under the header row.');
      setHeaders([]); setDataRows([]); setColumnMap([]);
      return;
    }
    const [head, ...rows] = grid;
    if (rows.length > MAX_ROWS) {
      setFileError(`This file has ${rows.length} rows — import at most ${MAX_ROWS} at a time.`);
      setHeaders([]); setDataRows([]); setColumnMap([]);
      return;
    }
    setFileError('');
    setFileName(name);
    setHeaders(head);
    setDataRows(rows);
    setColumnMap(head.map(guessStudentField));
  }, []);

  const loadFile = useCallback((name: string, content: ArrayBuffer | string) => {
    try {
      loadGrid(typeof content === 'string' ? parseCsv(content) : xlsxToGrid(content), name);
    } catch {
      setFileError("Couldn't read this file. Save it as .xlsx or .csv and try again.");
    }
  }, [loadGrid]);

  function setColumnField(col: number, field: StudentImportField | '') {
    // One spreadsheet column per field: picking a field elsewhere un-maps its old column.
    setColumnMap((prev) => prev.map((f, i) => (i === col ? field : f === field && field ? '' : f)));
  }

  const reviewed = useMemo(() => reviewRows(dataRows, columnMap, school?.curriculum ?? null), [dataRows, columnMap, school]);
  const readyRows = reviewed.filter((r) => r.issues.length === 0);
  const blockedRows = reviewed.filter((r) => r.issues.length > 0);
  const nameMapped = columnMap.includes('studentName');

  async function submit() {
    if (!schoolId) { setSubmitError('Choose a school first.'); return; }
    if (!nameMapped) { setSubmitError('Map a column to Student Name.'); return; }
    if (!readyRows.length) { setSubmitError('No rows are ready to import.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      setResult(await importSpreadsheet({ schoolId, fileName, rows: readyRows.map((r) => r.values) }));
    } catch (e: any) {
      setSubmitError(e?.message || 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFileName(''); setHeaders([]); setDataRows([]); setColumnMap([]);
    setFileError(''); setSubmitError(''); setResult(null);
  }

  return {
    schools, schoolsError, loadSchools, schoolPlaceholder, schoolId, setSchoolId, school,
    fileName, headers, columnMap, setColumnField, fileError, loadGrid, loadFile,
    reviewed, readyRows, blockedRows, nameMapped,
    submitting, submitError, result, submit, reset,
  };
}
