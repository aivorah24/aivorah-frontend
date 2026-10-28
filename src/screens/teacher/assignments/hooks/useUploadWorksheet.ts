import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { SUBJECTS, LANGUAGES } from '../constants';
import { pdfToImages, imagesToPdfBase64 } from '../utils/pdfHelpers';
import { stripGradePrefix, gradeFromLabel } from '../utils/helpers';
import { pollJob, detectWorksheetMeta } from '../services/jobsService';
import { normalizeCurriculum } from '../../../../utils/curriculum';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

interface UseUploadWorksheetArgs {
  user: any;
  title: string;
  setTitle: (v: string) => void;
  chapter: string;
  setChapter: React.Dispatch<React.SetStateAction<string>>;
  subject: string;
  setSubject: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  curriculum: string;
  setCurriculum: (v: string) => void;
  gradeOptions: string[];
  effectiveGrade: string;
  effectiveCurriculum: string;
  selectedLanguage: string;
  setSelectedLanguage: (v: string) => void;
  setSuccessCriteria: (v: string[]) => void;
  setTeacherNotes: React.Dispatch<React.SetStateAction<string>>;
  setIbWordBank: React.Dispatch<React.SetStateAction<string[]>>;
  setIbStamps: React.Dispatch<React.SetStateAction<string[]>>;
  setFormError: (v: string) => void;
  quizDifficulty: 'easy' | 'medium' | 'hard';
  setQuizQuestions: (v: any[]) => void;
  setType: (v: 'assignment' | 'quiz') => void;
  teacherCurricula?: string[];
}

// Owns the single-worksheet Upload flow (pick/upload -> auto-fill extract ->
// interactive-quiz generation -> extracted-questions MCQ conversion) —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// third step of its hooks/components decomposition (2026-08-25), mirroring
// useBulkUpload's shape.
// A curriculum printed on the sheet (e.g. a PYP worksheet) only wins if this teacher teaches it.
export function pickDetectedCurriculum(raw: string, teacherCurricula: string[]): string | null {
  const c = normalizeCurriculum(raw);
  if (!c) return null;
  if (teacherCurricula.length === 0) return c;
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return teacherCurricula.find((t) => key(t) === key(c)) ?? null;
}

export function useUploadWorksheet({
  user, title, setTitle, chapter, setChapter, subject, setSubject, grade, setGrade, curriculum, setCurriculum,
  gradeOptions, effectiveGrade, effectiveCurriculum, selectedLanguage, setSelectedLanguage,
  setSuccessCriteria, setTeacherNotes, setIbWordBank, setIbStamps, setFormError,
  quizDifficulty, setQuizQuestions, setType, teacherCurricula = [],
}: UseUploadWorksheetArgs) {
  function applyDetectedCurriculum(raw: string) {
    const c = pickDetectedCurriculum(raw, teacherCurricula);
    if (c) setCurriculum(c);
  }

  const [docFiles, setDocFiles] = useState<{ name: string; base64: string; mime: string; url?: string; sourcePdfBase64?: string; sourcePdfName?: string; structuredText?: string }[]>([]);
  const originalPdfRef = React.useRef<{ name: string; base64: string; mime: string; structuredText?: string } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [extractingQuestions, setExtractingQuestions] = useState(false);
  // Extracted questions from PDF/image — editable by teacher before publishing
  const [extractedQuestions, setExtractedQuestions] = useState<{ question: string; answer: string; comment: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingFromExtracted, setGeneratingFromExtracted] = useState(false);
  // Interactive quiz generation (Claude Vision primary, Mistral fallback)
  const [interactiveQuiz, setInteractiveQuiz] = useState<any>(null);
  const [generatingInteractiveQuiz, setGeneratingInteractiveQuiz] = useState(false);
  const [showInteractivePreview, setShowInteractivePreview] = useState(false);
  // Upload wizard step: 1=Upload & Classify, 2=Generate & Review, 3=Assign & Publish
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const uploadScrollRef = React.useRef<any>(null);

  function pickDoc() {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files: File[] = Array.from(e.target.files || []);
      if (files.length === 0) return;
      setUploadingDoc(true);

      // Read all files as base64
      const readFile = (f: File): Promise<{ name: string; base64: string; mime: string }> =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const result = ev.target?.result as string;
            resolve({ name: f.name, base64: result.split(',')[1], mime: f.type });
          };
          reader.readAsDataURL(f);
        });

      let fileDataArr = await Promise.all(files.map(readFile));

      // Grade / curriculum / chapter from the printed header + file name — fast,
      // so the form doesn't sit on the teacher's defaults while the AI
      // extraction below runs. What it finds wins over the AI's later guess.
      const detected: { grade?: string; curriculum?: string } = {};
      const metaReady = detectWorksheetMeta(fileDataArr[0], ASSIGNMENTS_SERVER_URL).then((meta) => {
        if (!meta) return;
        if (meta.grade) { detected.grade = meta.grade; setGrade(gradeFromLabel(meta.grade, gradeOptions)); }
        if (meta.curriculum) { detected.curriculum = meta.curriculum; applyDetectedCurriculum(meta.curriculum); }
        if (meta.chapter) setChapter(prev => prev || meta.chapter);
      });

      // Convert PDFs to per-page images for vision-based extraction
      console.log('[upload] Files before PDF conversion:', fileDataArr.map(f => `${f.name} (${f.mime})`));
      const expanded: typeof fileDataArr = [];
      for (const fd of fileDataArr) {
        let workingFd = fd;
        // Word .docx has no native page-image preview — convert to PDF server-side
        // first (mammoth+puppeteer), then feed it through the SAME pdfToImages
        // pipeline PDFs already use, so the upload thumbnail shows the real page
        // instead of a generic file icon.
        if (fd.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          try {
            console.log('[upload] Converting DOCX to PDF:', fd.name);
            const dRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/docx-to-pdf`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64: fd.base64 }),
            });
            const dData = await dRes.json();
            if (dRes.ok && dData.pdfBase64) {
              // structuredText (mammoth's docx->HTML converted to plain text
              // with exact table cells preserved) is ground truth for the
              // quiz-generation step below — it fixes a real bug where table
              // numbers (e.g. fractions) were being fabricated instead of
              // read from the source, because docx tables were flattened to
              // a PDF and re-guessed from the rendered image.
              workingFd = { name: fd.name.replace(/\.docx$/i, '.pdf'), base64: dData.pdfBase64, mime: 'application/pdf', structuredText: dData.structuredText } as any;
            } else {
              // Previously fell through silently and sent the RAW (unconverted)
              // Word bytes onward as if they were an image — which can never work
              // (Gemini vision can't read .docx bytes), so it just failed again
              // later with a confusing, unrelated-looking error. Surface the real
              // conversion error immediately instead.
              throw new Error(dData.error || 'Could not read this Word document. Please export it to PDF and upload that.');
            }
          } catch (e: any) {
            setUploadingDoc(false);
            setFormError(`"${fd.name}": ${e?.message || 'Could not read this Word document. Please export it to PDF and upload that.'}`);
            return;
          }
        }
        if (workingFd.mime === 'application/pdf') {
          // Save original PDF for interactive quiz generation (which needs full PDF, not single-page images)
          originalPdfRef.current = { name: workingFd.name, base64: workingFd.base64, mime: workingFd.mime, structuredText: (workingFd as any).structuredText };
          console.log('[upload] Converting PDF to images:', workingFd.name);
          const pageImages = await pdfToImages(workingFd.base64);
          console.log('[upload] PDF converted to', pageImages.length, 'images');
          if (pageImages.length > 0) {
            // Tie the original PDF to THESE page-images so quiz generation always
            // reads the PDF that belongs to the currently-selected files — never a
            // stale PDF left over in originalPdfRef from a PREVIOUS upload. That
            // stale-ref path was the "uploaded Telugu but got a Math quiz" bug:
            // a later image-only upload found no PDF in docFiles and silently fell
            // back to the previous worksheet's PDF still sitting in the ref.
            for (const p of pageImages) { (p as any).sourcePdfBase64 = workingFd.base64; (p as any).sourcePdfName = workingFd.name; (p as any).structuredText = (workingFd as any).structuredText; }
            expanded.push(...pageImages);
          } else {
            console.log('[upload] PDF conversion failed, sending as PDF');
            expanded.push(workingFd); // Fallback: send PDF as-is
          }
        } else {
          expanded.push(workingFd);
        }
      }
      fileDataArr = expanded;
      console.log('[upload] Files after PDF conversion:', fileDataArr.map(f => `${f.name} (${f.mime})`));

      // Upload all files (now all images)
      const uploadedFiles: { name: string; base64: string; mime: string; url?: string; sourcePdfBase64?: string; sourcePdfName?: string; structuredText?: string }[] = [];
      for (const fd of fileDataArr) {
        try {
          const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/upload-doc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: fd.base64, fileName: fd.name, mimeType: fd.mime }),
          });
          const data = await res.json();
          if (res.ok) {
            uploadedFiles.push({ name: fd.name, base64: fd.base64, mime: fd.mime, url: data.url, sourcePdfBase64: (fd as any).sourcePdfBase64, sourcePdfName: (fd as any).sourcePdfName, structuredText: (fd as any).structuredText });
          }
        } catch {/* skip failed uploads */}
      }

      if (uploadedFiles.length > 0) {
        setDocFiles(prev => [...prev, ...uploadedFiles]);
      }
      setUploadingDoc(false);

      // Extract content from all uploaded files (all are images now)
      if (uploadedFiles.length > 0) {
        setExtractingQuestions(true);
        try {
          const allBase64 = uploadedFiles.map(f => ({ base64: f.base64, mimeType: f.mime }));
          // Queued (Kafka/db job) instead of one blocking request — the browser
          // tab polls for the result rather than holding a connection open for
          // the whole AI extraction pipeline.
          const jobRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/extract-questions-async`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              allBase64.length === 1
                ? { fileBase64: allBase64[0].base64, mimeType: allBase64[0].mimeType, fileName: files[0]?.name }
                : { files: allBase64, fileName: files[0]?.name }
            ),
          });
          const jobData = await jobRes.json();
          if (!jobRes.ok || !jobData.jobId) throw new Error(jobData.error || 'Could not start extraction.');
          const eData = await pollJob(jobData.jobId, ASSIGNMENTS_SERVER_URL);
          await metaReady;
          console.log('[extract] job done, data:', JSON.stringify(eData).slice(0, 500));
          if (eData.title && !title.trim()) setTitle(stripGradePrefix(eData.title));
            // Use chapter if available, otherwise fall back to title as chapter/topic
            const chapterVal = stripGradePrefix(eData.chapter || eData.title || '');
            if (chapterVal) setChapter(prev => prev || chapterVal);
            if (eData.subject) {
              const extractedSubj = String(eData.subject).trim();
              const matchSubj = SUBJECTS.find(s => s.toLowerCase().includes(extractedSubj.toLowerCase()) || extractedSubj.toLowerCase().includes(s.toLowerCase()));
              // Never silently drop the worksheet's real extracted subject just
              // because it doesn't fuzzy-match one of the fixed subject labels —
              // fall back to the literal extracted text rather than leaving
              // whatever subject was previously selected (stale/wrong-looking).
              setSubject(matchSubj || extractedSubj);
            }
            // Specific language (Telugu/Hindi/etc.) is a separate field from subject —
            // a Language Acquisition worksheet must set the actual detected language,
            // not just leave whatever language was previously selected in the form.
            if (eData.language) {
              const matchLang = LANGUAGES.find(l => l.toLowerCase() === String(eData.language).toLowerCase());
              if (matchLang) setSelectedLanguage(matchLang);
            }
            if (eData.grade && !detected.grade) setGrade(gradeFromLabel(String(eData.grade), gradeOptions));
            // Was never applied: the form kept the teacher's own curriculum
            // (e.g. CBSE) on an IB PYP worksheet.
            if (eData.curriculum && !detected.curriculum) applyDetectedCurriculum(String(eData.curriculum));
            // Purpose and learning outcomes no longer auto-fill Note — teacher writes their own notes
            // if (eData.purpose) setNote(prev => prev || eData.purpose);
            // if (eData.learningOutcomes) ... removed to avoid duplication
            // Only actual success criteria checklist items
            if (Array.isArray(eData.successCriteria) && eData.successCriteria.length > 0) {
              setSuccessCriteria(eData.successCriteria.filter((c: string) => c.trim()));
            }
            if (eData.taskDescription) setTeacherNotes(prev => prev || eData.taskDescription);
            if (Array.isArray(eData.wordBank) && eData.wordBank.length > 0) {
              setIbWordBank(prev => [...new Set([...prev, ...eData.wordBank])]);
            }
            if (Array.isArray(eData.stamps) && eData.stamps.length > 0) {
              setIbStamps(prev => [...new Set([...prev, ...eData.stamps])]);
            }
            if (Array.isArray(eData.questions) && eData.questions.length > 0) {
              const mappedQuestions = eData.questions.map((q: any) => {
                const qText = typeof q === 'string' ? q : q.text || q;
                const needsImg = typeof q === 'object' ? !!q.needsImage : false;
                const pageIdx = typeof q === 'object' ? q.pageIndex : undefined;
                return { question: qText, answer: '', comment: '', pageIndex: pageIdx, needsImage: needsImg };
              });
              setExtractedQuestions(prev => [...prev, ...mappedQuestions]);
            }
        } catch (extractErr: any) {
          // Was previously silent — a network failure or unexpected server error here
          // would leave every field at default with zero indication of why, exactly
          // matching reports of "nothing got auto-filled." Now visible + logged.
          console.log('[extract] request failed:', extractErr?.message || extractErr);
          setFormError(`Auto-fill failed: ${extractErr?.message || 'network error'}. You can still fill in Subject/Grade/Chapter manually below.`);
        }
        finally { setExtractingQuestions(false); }
      }
    };
    input.click();
  }

  // Generate interactive quiz via Mistral (PDF/image → structured quiz with answers, hints, solutions)
  async function generateInteractiveQuiz() {
    if (docFiles.length === 0) return;
    // Guard against double-taps: without this, each tap while a generation was
    // already in flight queued ANOTHER job (the console showed 4-5 duplicate
    // "pdf (queued)" lines from a few impatient taps).
    if (generatingInteractiveQuiz) return;
    setGeneratingInteractiveQuiz(true);
    setInteractiveQuiz(null);
    try {
      // Prefer original PDF (sends ALL pages to Gemini Vision) over single-page images.
      // CRITICAL: only ever use a PDF that belongs to the CURRENT docFiles set — an
      // actual PDF entry, or one carried alongside a converted page-image via
      // sourcePdfBase64. We deliberately do NOT fall back to originalPdfRef here:
      // that decoupled ref persists across uploads and caused a later worksheet to
      // be generated from a PREVIOUS file (the Telugu→Math mixup).
      const pdfEntry = docFiles.find(f => f.mime === 'application/pdf');
      const carriedPdf = !pdfEntry ? docFiles.find(f => f.sourcePdfBase64) : null;
      let pdfFile: { name: string; base64: string; mime: string; structuredText?: string } | null =
        pdfEntry
          ? { name: pdfEntry.name, base64: pdfEntry.base64, mime: 'application/pdf', structuredText: pdfEntry.structuredText }
          : carriedPdf
            ? { name: carriedPdf.sourcePdfName || carriedPdf.name, base64: carriedPdf.sourcePdfBase64!, mime: 'application/pdf', structuredText: carriedPdf.structuredText }
            : null;
      // Multiple loose images with no PDF: stitch them into one PDF so EVERY page
      // is read, not just docFiles[0] (the old bug — pages 2+ were silently dropped).
      if (!pdfFile && docFiles.length > 1) {
        const imgs = docFiles.filter(f => f.mime.startsWith('image/'));
        if (imgs.length > 1) {
          const combined = await imagesToPdfBase64(imgs);
          if (combined) {
            pdfFile = { name: 'worksheet.pdf', base64: combined, mime: 'application/pdf' };
            console.log('[quiz-gen] combined', imgs.length, 'images into one PDF for full multi-page read');
          }
        }
      }
      const file = pdfFile || docFiles[0];
      const isImage = !pdfFile && file.mime.startsWith('image/');
      console.log('[quiz-gen]', isImage ? 'image (sync)' : 'pdf (queued)', 'with', file.mime, 'name:', file.name, 'pages in docFiles:', docFiles.length);

      let data: any;
      if (isImage) {
        // No queued path for the image endpoint yet — still one blocking request.
        const formData = new FormData();
        const byteChars = atob(file.base64);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArray], { type: file.mime });
        formData.append('image', blob, file.name || 'worksheet.jpg');
        formData.append('grade', grade || effectiveGrade);
        formData.append('subject', subject || 'Mathematics');
        formData.append('school', user?.school || '');
        if (selectedLanguage) formData.append('language', selectedLanguage);
        const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/generate-image`, { method: 'POST', body: formData });
        data = await res.json();
        if (!res.ok) data = { error: data.error || 'Failed to generate interactive quiz' };
      } else {
        // Queued (Kafka/db job) — the browser tab polls for the result rather
        // than holding a connection open for the whole AI generation pipeline.
        const jobRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/generate-async`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: file.base64, mimeType: file.mime, filename: file.name || 'worksheet.pdf',
            grade: grade || effectiveGrade, subject: subject || 'Mathematics', school: user?.school || '',
            structuredText: (file as any).structuredText,
            language: selectedLanguage || undefined,
          }),
        });
        const jobData = await jobRes.json();
        if (!jobRes.ok || !jobData.jobId) throw new Error(jobData.error || 'Could not start quiz generation.');
        data = await pollJob(jobData.jobId, ASSIGNMENTS_SERVER_URL);
      }
      if (data.quiz) {
        // Force school/curriculum to the teacher's REAL account values, always —
        // never trust whatever the AI put in quiz.school. The vision prompt asks
        // the AI to echo back the passed school name, but it can instead read
        // whatever school name/logo is physically PRINTED on the worksheet page
        // (e.g. a photocopied packet from a different school) and put THAT in
        // quiz.school. Since branding lookup (fetchBranding) does an exact-name
        // match against branding_logos, that mismatch silently returned no logo
        // on every SUBSEQUENT re-fetch (e.g. re-clicking the Preview tab), which
        // reads school/curriculum from this stored object, not from account state.
        // Stamp the EXACT file set this quiz was generated from. createAssignment()
        // re-computes this key from the then-current docFiles and refuses to publish
        // if it changed — so a quiz can never be published against a different
        // worksheet than the one it was built from (the Telugu→Math class of bug).
        const sourceDocKey = docFiles.map(f => f.url || f.name).sort().join('|');
        // language: the teacher's pick (or the sheet's own, auto-detected server-side
        // when blank) drives the students' answer keyboard/IME in the rendered quiz.
        const quizData = { ...data.quiz, school: user?.school || '', curriculum: effectiveCurriculum, language: selectedLanguage || data.quiz.language || '', _editMode: false, _sourceDocKey: sourceDocKey };
        try {
          const previewRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: quizData }) });
          if (previewRes.ok) quizData._previewHTML = await previewRes.text();
        } catch {}
        setInteractiveQuiz(quizData);
        setShowInteractivePreview(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to generate interactive quiz');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate interactive quiz');
    } finally {
      setGeneratingInteractiveQuiz(false);
    }
  }

  // Changing the worksheet language after generation re-renders the preview with it
  // (it used to be ignored, so "change language" did nothing).
  useEffect(() => {
    if (!interactiveQuiz || interactiveQuiz._editMode) return;
    if ((interactiveQuiz.language || '') === selectedLanguage) return;
    const updated = { ...interactiveQuiz, language: selectedLanguage };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync quiz language with the picker
    setInteractiveQuiz(updated);
    fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: updated }),
    })
      .then(r => (r.ok ? r.text() : null))
      .then(html => { if (html) setInteractiveQuiz((q: any) => (q && q.language === selectedLanguage ? { ...q, _previewHTML: html } : q)); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-render only when the chosen language changes
  }, [selectedLanguage]);

  // Generate MCQ quiz from extracted worksheet questions
  async function generateQuizFromExtracted() {
    const qs = extractedQuestions.filter(q => q.question.trim());
    if (qs.length === 0) return;
    setGeneratingFromExtracted(true);
    try {
      const prompt = qs.map((q, i) => `${i + 1}. ${q.question}${q.answer ? ` (Answer: ${q.answer})` : ''}`).join('\n');
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/pdf-to-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: '', mimeType: 'text/plain',
          subject, grade,
          difficulty: quizDifficulty || 'medium',
          count: qs.length,
        }),
      });
      // We'll use a direct LLM call via the existing generate-quiz with the questions as teacherNotes
      const res2 = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, chapter: chapter.trim(), grade, curriculum,
          difficulty: quizDifficulty, count: qs.length,
          teacherNotes: `Convert these worksheet questions into MCQ format. Use these exact questions:\n${prompt}`,
        }),
      });
      const data = await res2.json();
      if (res2.ok && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setType('quiz');
      }
    } catch {}
    finally { setGeneratingFromExtracted(false); }
  }

  function resetUploadState() {
    setDocFiles([]); originalPdfRef.current = null;
    setUploadingDoc(false); setExtractingQuestions(false);
    setExtractedQuestions([]); setShowPreview(false);
    setGeneratingFromExtracted(false);
    setInteractiveQuiz(null); setGeneratingInteractiveQuiz(false); setShowInteractivePreview(false);
    setUploadStep(1);
  }

  return {
    docFiles, setDocFiles, originalPdfRef, uploadingDoc, setUploadingDoc,
    extractingQuestions, setExtractingQuestions,
    extractedQuestions, setExtractedQuestions, showPreview, setShowPreview,
    generatingFromExtracted, setGeneratingFromExtracted,
    interactiveQuiz, setInteractiveQuiz, generatingInteractiveQuiz, setGeneratingInteractiveQuiz,
    showInteractivePreview, setShowInteractivePreview,
    uploadStep, setUploadStep, uploadScrollRef,
    pickDoc, generateInteractiveQuiz, generateQuizFromExtracted, resetUploadState,
  };
}
