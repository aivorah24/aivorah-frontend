import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { bulkImportStudents, fetchImportTemplate } from '../services/studentsService';

export function useBulkImport(user: any, onImported: () => void) {
  const [bulkGrade,        setBulkGrade]        = useState('Grade 3');
  const [bulkCurriculum,   setBulkCurriculum]   = useState('IB PYP');
  const [bulkImporting,    setBulkImporting]    = useState(false);
  const [bulkResults,      setBulkResults]      = useState<any[] | null>(null);
  const [bulkSummary,      setBulkSummary]      = useState<any | null>(null);
  const [bulkError,        setBulkError]        = useState('');
  // Two-step flow: uploading a file only ever PREVIEWS it (classifies rows as
  // matched/needs-review/skipped, creates nothing). bulkPreview=true while
  // showing that review screen. The teacher checks off exactly who to import
  // (by row index — stable across the preview→commit resubmission of the same
  // file) and only the explicit "Import Selected" tap actually creates anyone.
  const [bulkPreview,      setBulkPreview]       = useState(false);
  const [selectedRows,     setSelectedRows]      = useState<Set<number>>(new Set());
  const bulkFileRef = useRef<File | null>(null); // kept so the commit step can resubmit the same file
  const fileInputRef = useRef<any>(null);

  // confirmedMismatches: rowKey ("Name|Grade|Curriculum") → true, for rows the
  // teacher explicitly approved after being warned they're outside the
  // grades/curricula they teach.
  //
  // STEP 1 — preview only: classifies every row (matched / needs review /
  // already exists) with ZERO database writes, no accounts created, no email,
  // no download. Nothing happens just from picking a file.
  async function previewBulkImport(file: File) {
    bulkFileRef.current = file;
    setBulkImporting(true); setBulkError(''); setBulkResults(null); setBulkSummary(null); setBulkPreview(false);
    try {
      const formData = new FormData();
      formData.append('csv', file, file.name);
      formData.append('defaultGrade', bulkGrade);
      formData.append('defaultCurriculum', bulkCurriculum);
      formData.append('previewOnly', 'true');

      const res = await bulkImportStudents(user?.email || '', formData);
      const data = await res.json();
      if (!res.ok) { setBulkError(data.error || 'Could not read this file.'); return; }
      setBulkResults(data.results || []);
      setBulkSummary(data.summary || null);
      setBulkPreview(true);
      // Every importable row (matched or needs-review) starts checked — the
      // teacher can uncheck any of them; nothing is created until they tap
      // "Import Selected".
      setSelectedRows(new Set(
        (data.results || [])
          .filter((r: any) => r.status === 'matched' || r.status === 'needs_confirmation')
          .map((r: any) => r.rowIndex)
      ));
    } catch (e: any) {
      setBulkError(e.message || 'Network error. Please try again.');
    } finally {
      setBulkImporting(false);
    }
  }

  function toggleRow(rowIndex: number) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
      return next;
    });
  }

  // STEP 2 — the ONLY action that actually creates anyone. Resubmits the same
  // file with exactly the row indexes the teacher left checked (whether they
  // were originally matched or flagged for review) — one single pass, one
  // download, one email, then the modal closes.
  async function commitBulkImport(closeAddModal: () => void) {
    if (!bulkFileRef.current) return;
    setBulkImporting(true); setBulkError('');
    try {
      const formData = new FormData();
      formData.append('csv', bulkFileRef.current, bulkFileRef.current.name);
      formData.append('defaultGrade', bulkGrade);
      formData.append('defaultCurriculum', bulkCurriculum);
      formData.append('selectedRowIndexes', JSON.stringify(Array.from(selectedRows)));
      // Real-email students get an invite that links back to this app.
      if (Platform.OS === 'web' && typeof window !== 'undefined') formData.append('frontendOrigin', window.location.origin);

      const res = await bulkImportStudents(user?.email || '', formData);
      const data = await res.json();
      if (!res.ok) { setBulkError(data.error || 'Bulk import failed.'); return; }
      downloadCredentials(data.results || []);
      onImported();
      // The commit step is the entire import — nothing is ever left pending
      // after it, so the modal always closes once it succeeds.
      closeAddModal();
      setBulkResults(null); setBulkSummary(null); setBulkPreview(false); bulkFileRef.current = null;
    } catch (e: any) {
      setBulkError(e.message || 'Network error. Please try again.');
    } finally {
      setBulkImporting(false);
    }
  }

  // Server-rendered templates (same style as the School Admin bulk import):
  // branded header, borders, frozen row and fake sample rows only — never
  // any real student or parent data.
  //
  // Use a same-origin anchor with the `download` attribute rather than
  // window.open — window.open can be popup-blocked or (in this SPA) open a
  // blank/navigating tab that lands on the dashboard instead of saving the
  // file. An <a download> forces a real download without touching app nav.
  // Fetch the file and download it as a blob URL. A plain same-origin anchor
  // gets intercepted by the SPA router (navigates to the dashboard instead of
  // downloading); a blob: URL can't be intercepted, so this reliably saves the
  // file to Downloads without navigating the app.
  async function triggerTemplateDownload(ext: 'csv' | 'xlsx') {
    if (!user?.email || Platform.OS !== 'web') return;
    try {
      const res = await fetchImportTemplate(user.email, ext);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `students_template.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (e) {
      console.error('[template download] failed:', e);
    }
  }

  function downloadTemplate() { triggerTemplateDownload('csv'); }
  function downloadTemplateXlsx() { triggerTemplateDownload('xlsx'); }

  // A single sheet with every login/password from this commit batch — the
  // teacher gets the same list by email too. Auto-triggered right after
  // commitBulkImport succeeds instead of requiring a manual click.
  function downloadCredentials(rows: any[]) {
    const created = rows.filter((r: any) => r.status === 'created' && r.password);
    if (created.length === 0) return;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'Name,Role,Login Email,Password,Grade,Curriculum\n';
    const body = created.map((r: any) => {
      const isParent = r.role === 'parent';
      return [
        r.name,
        isParent ? 'Parent' : 'Student',
        r.email,
        r.password,
        isParent ? '' : (r.grade || bulkGrade),
        isParent ? '' : (r.curriculum || bulkCurriculum),
      ].map(esc).join(',');
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `student_logins_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Clears the preview/commit state — used by the modal close button and the
  // preview's own Cancel.
  function resetBulkState() {
    setBulkResults(null); setBulkSummary(null); setBulkPreview(false); setBulkError('');
    bulkFileRef.current = null;
  }

  return {
    bulkGrade, setBulkGrade, bulkCurriculum, setBulkCurriculum,
    bulkImporting, bulkResults, setBulkResults, bulkSummary, setBulkSummary,
    bulkError, setBulkError, bulkPreview, setBulkPreview,
    selectedRows, toggleRow, fileInputRef,
    previewBulkImport, commitBulkImport,
    downloadTemplate, downloadTemplateXlsx, resetBulkState,
  };
}
