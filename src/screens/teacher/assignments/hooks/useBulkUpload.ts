import { useState } from 'react';
import type { Assignment, BulkItem } from '../types';
import { SUBJECTS, LANGUAGES } from '../constants';
import { pdfToImages } from '../utils/pdfHelpers';
import { stripGradePrefix } from '../utils/helpers';
import { extractViaQueue } from '../services/jobsService';
import SERVER_URL from '../../../../config/serverUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

interface UseBulkUploadArgs {
  user: any;
  teacherEmail: string;
  effectiveGrade: string;
  effectiveCurriculum: string;
  gradeOptions: string[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  reloadAssignments: () => void;
}

// Owns the 3-phase Bulk Upload flow (pick -> classify -> generate -> assign
// & publish) — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, second step of its hooks/components
// decomposition (2026-08-25).
export function useBulkUpload({
  user, teacherEmail, effectiveGrade, effectiveCurriculum, gradeOptions,
  setAssignments, reloadAssignments,
}: UseBulkUploadArgs) {
  const [bulkPhase, setBulkPhase] = useState<'pick' | 'classify' | 'generate' | 'assign'>('pick');
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkDueDate, setBulkDueDate] = useState('');

  function updateBulkItem(id: string, patch: Partial<BulkItem>) {
    setBulkItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }

  function pickBulkDocs() {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files: File[] = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const readFile = (f: File): Promise<{ name: string; base64: string; mime: string }> =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const result = ev.target?.result as string;
            resolve({ name: f.name, base64: result.split(',')[1], mime: f.type });
          };
          reader.readAsDataURL(f);
        });
      const picked = await Promise.all(files.map(readFile));

      const initialItems: BulkItem[] = picked.map((f, i) => ({
        id: `${Date.now()}-${i}`, name: f.name, mime: f.mime, base64: f.base64,
        pages: [], status: 'extracting',
        title: '', subject: 'Mathematics', grade: effectiveGrade, curriculum: effectiveCurriculum, chapter: '', language: '',
        quiz: null, quizHtml: '', quizStatus: 'idle',
        assignTo: 'all', selectedStudentId: null,
        publishStatus: 'idle',
      }));
      setBulkItems(initialItems);
      setBulkPhase('classify');

      for (const item of initialItems) {
        try {
          let working: { name: string; base64: string; mime: string } = { name: item.name, base64: item.base64, mime: item.mime };
          if (working.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const dRes = await fetch(`${SERVER_URL}/assignments/docx-to-pdf`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64: working.base64 }),
            });
            const dData = await dRes.json();
            if (dRes.ok && dData.pdfBase64) {
              working = { name: working.name.replace(/\.docx$/i, '.pdf'), base64: dData.pdfBase64, mime: 'application/pdf' };
            } else {
              // Previously fell through silently and treated the RAW (unconverted)
              // Word bytes as an "image" page, which can never work — it just
              // failed again downstream with a confusing, delayed error at the
              // Generate step instead of here, at Classify, where the real cause
              // (docx conversion failure) actually happened.
              throw new Error(dData.error || 'Could not read this Word document. Please export it to PDF and upload that.');
            }
          }
          const pages = working.mime === 'application/pdf' ? await pdfToImages(working.base64) : [working];
          const pageFiles = pages.length > 0 ? pages : [working];
          const fileList = pageFiles.map(p => ({ base64: p.base64, mimeType: p.mime }));

          const eData = await extractViaQueue(ASSIGNMENTS_SERVER_URL,
            fileList.length === 1 ? { fileBase64: fileList[0].base64, mimeType: fileList[0].mimeType } : { files: fileList }
          );

          const extractedSubj = eData.subject
            ? (SUBJECTS.find(s => s.toLowerCase().includes(String(eData.subject).toLowerCase()) || String(eData.subject).toLowerCase().includes(s.toLowerCase())) || String(eData.subject))
            : 'Mathematics';
          const rawGrade = eData.grade ? String(eData.grade).trim() : '';
          const gradeStr = rawGrade.replace(/[^0-9]/g, '');
          const resolvedGrade = rawGrade ? (gradeOptions.find(g => (gradeStr && g.includes(gradeStr)) || g.toLowerCase() === rawGrade.toLowerCase()) || (gradeStr ? `Grade ${gradeStr}` : rawGrade)) : effectiveGrade;
          const resolvedTitle = stripGradePrefix(eData.title || eData.chapter || item.name.replace(/\.[^.]+$/, ''));
          const matchLang = eData.language ? LANGUAGES.find(l => l.toLowerCase() === String(eData.language).toLowerCase()) : undefined;

          updateBulkItem(item.id, {
            // name MUST be updated alongside mime/base64 when docx→pdf converts —
            // the server's /quiz/generate re-detects "is this a docx?" from the
            // FILENAME extension, not just the mimetype. Leaving the old ".docx"
            // name here made it re-attempt a docx→pdf conversion on bytes that
            // were ALREADY a PDF, which mammoth can't parse, producing
            // "Could not read this Word document" even though the file was fine.
            name: working.name, mime: working.mime, base64: working.base64,
            pages: pageFiles, status: 'ready',
            title: resolvedTitle, chapter: stripGradePrefix(eData.chapter) || resolvedTitle,
            subject: extractedSubj, grade: resolvedGrade, language: matchLang || '',
          });
        } catch (err: any) {
          updateBulkItem(item.id, { status: 'error', error: err.message || 'Extraction failed' });
        }
      }
    };
    input.click();
  }

  // Generates (or re-generates) the quiz for ONE bulk item. Pulled out of
  // generateAllBulkQuizzes so a single failed worksheet (e.g. a one-off "AI
  // returned invalid JSON" — a known occasional flakiness in the underlying
  // vision pipeline, not specific to bulk upload) can be retried on its own
  // without re-running the whole batch.
  async function generateOneBulkQuiz(item: BulkItem) {
    updateBulkItem(item.id, { quizStatus: 'generating', quizError: undefined });
    try {
      const isImage = item.mime.startsWith('image/');
      const formData = new FormData();
      const byteChars = atob(item.base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let b = 0; b < byteChars.length; b++) byteArray[b] = byteChars.charCodeAt(b);
      const blob = new Blob([byteArray], { type: item.mime });
      formData.append(isImage ? 'image' : 'pdf', blob, item.name);
      formData.append('grade', item.grade || 'Grade 3');
      formData.append('subject', item.subject || 'Mathematics');
      formData.append('school', user?.school || '');
      const qRes = await fetch(`${SERVER_URL}${isImage ? '/quiz/generate-image' : '/quiz/generate'}`, { method: 'POST', body: formData });
      const qData = await qRes.json();
      if (!qRes.ok || !qData.quiz) throw new Error(qData.error || 'Quiz generation failed');

      // Force school/curriculum to the teacher's REAL account values on the
      // STORED quiz object itself — never trust quiz.school as returned by the
      // AI. It's asked to echo back the passed school name, but can instead
      // read a school name/logo physically PRINTED on the worksheet page and
      // put THAT there instead, which silently breaks the branding lookup
      // (exact-name match) on every later re-fetch (e.g. re-opening Preview).
      const brandedQuiz = { ...qData.quiz, school: user?.school || '', curriculum: item.curriculum || effectiveCurriculum };
      let previewHTML = '';
      try {
        const pRes = await fetch(`${SERVER_URL}/quiz/render-preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: brandedQuiz }) });
        if (pRes.ok) previewHTML = await pRes.text();
      } catch {}
      updateBulkItem(item.id, { quiz: brandedQuiz, quizHtml: previewHTML, quizStatus: 'done' });
    } catch (err: any) {
      updateBulkItem(item.id, { quizStatus: 'error', quizError: err.message || 'Failed' });
    }
  }

  // ── PHASE 2 — generate the interactive quiz for every ready item ──────────
  async function generateAllBulkQuizzes() {
    setBulkPhase('generate');
    const items = bulkItems.filter(it => it.status === 'ready');
    for (const item of items) {
      await generateOneBulkQuiz(item);
    }
  }

  // ── PHASE 3 — publish every item that has a generated quiz ────────────────
  async function publishAllBulkItems() {
    const items = bulkItems.filter(it => it.quizStatus === 'done');
    for (const item of items) {
      updateBulkItem(item.id, { publishStatus: 'publishing' });
      try {
        const cRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title, subject: item.subject, chapter: item.chapter,
            dueDate: bulkDueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            type: 'assignment',
            studentId: item.assignTo === 'specific' ? item.selectedStudentId : null,
            createdById: teacherEmail, createdByRole: 'teacher',
            grade: item.grade, curriculum: item.curriculum,
            interactiveQuiz: item.quiz, interactiveQuizHtml: item.quizHtml || null,
            language: item.subject === 'Language Acquisition' ? item.language : null,
            documentUrls: [],
          }),
        });
        if (!cRes.ok) { const cErr = await cRes.json().catch(() => ({})); throw new Error(cErr.error || 'Publish failed'); }
        const created = await cRes.json();
        setAssignments(prev => [created, ...prev]);
        updateBulkItem(item.id, { publishStatus: 'done' });
      } catch (err: any) {
        updateBulkItem(item.id, { publishStatus: 'error', publishError: err.message || 'Failed' });
      }
    }
    reloadAssignments();
  }

  function resetBulkState() {
    setBulkPhase('pick'); setBulkItems([]); setBulkDueDate('');
  }

  return {
    bulkPhase, setBulkPhase, bulkItems, setBulkItems, bulkDueDate, setBulkDueDate,
    updateBulkItem, pickBulkDocs, generateOneBulkQuiz, generateAllBulkQuizzes, publishAllBulkItems,
    resetBulkState,
  };
}
