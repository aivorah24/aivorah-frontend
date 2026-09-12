import { useState } from 'react';
import type { Assignment, BulkItem } from '../types';
import { SUBJECTS, LANGUAGES } from '../constants';
import { pdfToImages } from '../utils/pdfHelpers';
import { stripGradePrefix } from '../utils/helpers';
import { groupedImageIdSet, resolveImageGroups } from '../utils/imageGrouping';
import { extractViaQueue } from '../services/jobsService';
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
  type PickedFile = { name: string; base64: string; mime: string };

  const [bulkPhase, setBulkPhase] = useState<'pick' | 'group' | 'classify' | 'generate' | 'assign'>('pick');
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkDueDate, setBulkDueDate] = useState('');

  // ── Image grouping (Bulk Upload Images) ────────────────────────────────
  // Multiple raw images picked in one go (e.g. phone photos of a multi-page
  // worksheet) used to each become their OWN separate BulkItem — so a
  // 3-page worksheet photographed as 3 images produced 3 unrelated
  // "worksheets" instead of one. A PDF's pages were always kept together
  // (pdfToImages -> one item's `pages[]`); images now go through the same
  // explicit grouping the teacher controls, matching how a scanner app lets
  // you combine several shots into one document. Only engaged when 2+ raw
  // images are picked — a single image, or any PDF/DOCX, is unaffected and
  // goes straight to Classify exactly as before.
  const [pendingImages, setPendingImages] = useState<Array<PickedFile & { id: string }>>([]);
  const [imageSelection, setImageSelection] = useState<string[]>([]);
  const [imageGroups, setImageGroups] = useState<Array<{ id: string; imageIds: string[] }>>([]);

  function toggleImageSelection(id: string) {
    setImageSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function confirmImageGroup() {
    if (imageSelection.length < 2) return;
    setImageGroups(prev => [...prev, { id: `group-${Date.now()}`, imageIds: imageSelection }]);
    setImageSelection([]);
  }

  function dissolveImageGroup(groupId: string) {
    setImageGroups(prev => prev.filter(g => g.id !== groupId));
  }

  function groupedImageIds(): Set<string> {
    return groupedImageIdSet(imageGroups);
  }

  function updateBulkItem(id: string, patch: Partial<BulkItem>) {
    setBulkItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }

  function readFile(f: File): Promise<PickedFile> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        resolve({ name: f.name, base64: result.split(',')[1], mime: f.type });
      };
      reader.readAsDataURL(f);
    });
  }

  // Runs the existing extraction/classification loop over already-built
  // BulkItems (one per resulting worksheet — a grouped item's `pages[]`
  // already holds all its images). Shared by the no-grouping-needed path
  // and by finishImageGrouping().
  async function runExtraction(initialItems: BulkItem[]) {
      setBulkItems(initialItems);
      setBulkPhase('classify');

      for (const item of initialItems) {
        try {
          let working: { name: string; base64: string; mime: string; structuredText?: string } = { name: item.name, base64: item.base64, mime: item.mime };
          if (working.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const dRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/docx-to-pdf`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64: working.base64 }),
            });
            const dData = await dRes.json();
            if (dRes.ok && dData.pdfBase64) {
              // structuredText is ground truth for the generate step below —
              // fixes fabricated table numbers on docx-sourced worksheets.
              working = { name: working.name.replace(/\.docx$/i, '.pdf'), base64: dData.pdfBase64, mime: 'application/pdf', structuredText: dData.structuredText };
            } else {
              // Previously fell through silently and treated the RAW (unconverted)
              // Word bytes as an "image" page, which can never work — it just
              // failed again downstream with a confusing, delayed error at the
              // Generate step instead of here, at Classify, where the real cause
              // (docx conversion failure) actually happened.
              throw new Error(dData.error || 'Could not read this Word document. Please export it to PDF and upload that.');
            }
          }
          // A pre-grouped multi-image item (see finishImageGrouping) already
          // has its full pages[] set — its own base64/mime is just the first
          // image's, a representative cover, so it must NOT be re-derived here.
          let pageFiles: { name: string; base64: string; mime: string }[];
          if (item.pages.length > 1) {
            pageFiles = item.pages;
          } else {
            const pages = working.mime === 'application/pdf' ? await pdfToImages(working.base64) : [working];
            pageFiles = pages.length > 0 ? pages : [working];
          }
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
            structuredText: working.structuredText,
          });
        } catch (err: any) {
          updateBulkItem(item.id, { status: 'error', error: err.message || 'Extraction failed' });
        }
      }
  }

  function buildItem(f: PickedFile, id: string): BulkItem {
    return {
      id, name: f.name, mime: f.mime, base64: f.base64,
      pages: [], status: 'extracting',
      title: '', subject: 'Mathematics', grade: effectiveGrade, curriculum: effectiveCurriculum, chapter: '', language: '',
      quiz: null, quizHtml: '', quizStatus: 'idle',
      assignTo: 'all', selectedStudentId: null,
      publishStatus: 'idle',
    };
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
      const picked = await Promise.all(files.map(readFile));

      const imageFiles = picked.filter(f => f.mime.startsWith('image/'));
      const otherFiles = picked.filter(f => !f.mime.startsWith('image/'));

      if (imageFiles.length > 1) {
        // Multiple raw images — let the teacher explicitly group pages of the
        // same worksheet before extraction runs. Non-image files (PDF/DOCX)
        // don't need grouping (a PDF's pages already travel together) — they
        // still go straight into the same batch, built immediately below.
        setPendingImages(imageFiles.map((f, i) => ({ ...f, id: `img-${Date.now()}-${i}` })));
        setImageSelection([]);
        setImageGroups([]);
        const otherItems = otherFiles.map((f, i) => buildItem(f, `${Date.now()}-other-${i}`));
        setBulkItems(otherItems);
        setBulkPhase('group');
        return;
      }

      const initialItems = picked.map((f, i) => buildItem(f, `${Date.now()}-${i}`));
      await runExtraction(initialItems);
    };
    input.click();
  }

  // Called from the Group step once the teacher is done combining images —
  // any image left ungrouped becomes its own single-page worksheet, same as
  // picking just one image always did.
  async function finishImageGrouping() {
    const { groups, ungrouped } = resolveImageGroups(pendingImages, imageGroups);

    const groupItems: BulkItem[] = groups.map((images, gi) => {
      const cover = images[0];
      const item = buildItem(cover, `${Date.now()}-group-${gi}`);
      item.pages = images.map(img => ({ name: img.name, base64: img.base64, mime: img.mime }));
      return item;
    });
    const singleItems: BulkItem[] = ungrouped.map((img, i) => buildItem(img, `${Date.now()}-single-${i}`));

    const newItems = [...groupItems, ...singleItems];
    setPendingImages([]);
    setImageSelection([]);
    setImageGroups([]);
    // Preserve any non-image items already staged (PDF/DOCX picked alongside
    // the images) — they were set into bulkItems when entering the group phase.
    await runExtraction([...bulkItems, ...newItems]);
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
      if (item.structuredText) formData.append('structuredText', item.structuredText);
      const qRes = await fetch(`${ASSIGNMENTS_SERVER_URL}${isImage ? '/quiz/generate-image' : '/quiz/generate'}`, { method: 'POST', body: formData });
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
        const pRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: brandedQuiz }) });
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
    setPendingImages([]); setImageSelection([]); setImageGroups([]);
  }

  return {
    bulkPhase, setBulkPhase, bulkItems, setBulkItems, bulkDueDate, setBulkDueDate,
    updateBulkItem, pickBulkDocs, generateOneBulkQuiz, generateAllBulkQuizzes, publishAllBulkItems,
    resetBulkState,
    // Image grouping
    pendingImages, imageSelection, imageGroups,
    toggleImageSelection, confirmImageGroup, dissolveImageGroup, groupedImageIds, finishImageGrouping,
  };
}
