import { useCallback, useMemo, useState } from 'react';
import { guessStudentField, parseCsv, xlsxToGrid, type StudentImportField } from '../../../../utils/spreadsheet';
import { useAdminSchools } from '../../shared/useAdminSchools';
import { importSpreadsheet } from '../services/bulkImportService';
import { reviewRows } from '../utils/reviewRows';
import type { SpreadsheetImportResult } from '../types';

const MAX_ROWS = 500;

export function useSpreadsheetImport() {
  const { schools, error: schoolsError, reload: loadSchools, placeholder: schoolPlaceholder } = useAdminSchools();
  const [schoolId, setSchoolIdState] = useState('');
  const [chosenBoard, setChosenBoard] = useState('');
  const [includeParents, setIncludeParents] = useState(true);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<(StudentImportField | '')[]>([]);
  const [sheetCurriculumCol, setSheetCurriculumCol] = useState(-1);
  const [editingColumns, setEditingColumns] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<SpreadsheetImportResult | null>(null);

  const school = useMemo(() => schools.find((s) => s.id === schoolId) || null, [schools, schoolId]);
  // A school with no curriculum needs one picked here; the import saves it to the school.
  const needsBoard = !!school && !school.curriculum;
  const board = school?.curriculum || (needsBoard && chosenBoard) || null;
  const setSchoolId = useCallback((id: string) => { setSchoolIdState(id); setChosenBoard(''); }, []);

  // Grid = header row + data rows, from either an .xlsx/.xls or a .csv file.
  const loadGrid = useCallback((grid: string[][], name: string) => {
    setResult(null);
    setSubmitError('');
    if (grid.length < 2) {
      setFileError('This file has no student rows under the header row.');
      setHeaders([]); setDataRows([]); setColumnMap([]);
      return;
    }
    const [head, ...allRows] = grid;
    const guessed = head.map(guessStudentField);
    const curriculumCol = guessed.indexOf('curriculum');
    // Template rows with only a curriculum filled in count as blank.
    const rows = allRows.filter((r) => r.some((c, i) => i !== curriculumCol && String(c ?? '').trim() !== ''));
    if (rows.length === 0) {
      setFileError('This file has no student rows under the header row.');
      setHeaders([]); setDataRows([]); setColumnMap([]);
      return;
    }
    if (rows.length > MAX_ROWS) {
      setFileError(`This file has ${rows.length} rows — import at most ${MAX_ROWS} at a time.`);
      setHeaders([]); setDataRows([]); setColumnMap([]);
      return;
    }
    setFileError('');
    setFileName(name);
    setHeaders(head);
    setDataRows(rows);
    // Curriculum comes from the school — a curriculum column is never imported, only checked against it.
    setSheetCurriculumCol(curriculumCol);
    setColumnMap(guessed.map((f) => (f === 'curriculum' ? '' : f)));
    setEditingColumns(false);
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

  const reviewed = useMemo(
    () => reviewRows(dataRows, columnMap, board, sheetCurriculumCol, includeParents),
    [dataRows, columnMap, board, sheetCurriculumCol, includeParents],
  );
  const readyRows = reviewed.filter((r) => r.issues.length === 0);
  const blockedRows = reviewed.filter((r) => r.issues.length > 0);
  const nameMapped = columnMap.includes('studentName');
  const parentMapped = columnMap.includes('parentName');
  const parentCount = readyRows.filter((r) => !!r.values.parentName).length;
  // Mapping card stays collapsed while every required column is matched.
  const columnsOpen = editingColumns || !nameMapped;

  async function submit() {
    if (!schoolId) { setSubmitError('Choose a school first.'); return; }
    if (needsBoard && !chosenBoard) { setSubmitError('Choose a curriculum for this school.'); return; }
    if (!nameMapped) { setSubmitError('Map a column to Student Name.'); return; }
    if (!readyRows.length) { setSubmitError('No rows are ready to import.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      setResult(await importSpreadsheet({
        schoolId, fileName, rows: readyRows.map((r) => r.values), ...(needsBoard && { curriculum: chosenBoard }),
      }));
      if (needsBoard) loadSchools(); // school now has a curriculum
    } catch (e: any) {
      setSubmitError(e?.message || 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFileName(''); setHeaders([]); setDataRows([]); setColumnMap([]); setSheetCurriculumCol(-1); setEditingColumns(false);
    setFileError(''); setSubmitError(''); setResult(null);
  }

  return {
    schools, schoolsError, loadSchools, schoolPlaceholder, schoolId, setSchoolId, school,
    needsBoard, chosenBoard, setChosenBoard, board, includeParents, setIncludeParents,
    fileName, headers, columnMap, setColumnField, columnsOpen, setEditingColumns, fileError, loadGrid, loadFile,
    reviewed, readyRows, blockedRows, nameMapped, parentMapped, parentCount,
    submitting, submitError, result, submit, reset,
  };
}
