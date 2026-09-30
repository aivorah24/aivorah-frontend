import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_EDITS, type SubjectEdits } from '../../../student/learning-paths/subject-syllabus/subjectEdits';
import { getSubjectEdits, saveSubjectEdits, publishSubjectEdits, type SubjectScope, type EditsStatus } from '../services/subjectEditsService';

const AUTOSAVE_MS = 1200;
type Op = (base: any[], edits: SubjectEdits) => SubjectEdits;

// The teacher's working copy of one subject: every change saves itself shortly after; Publish sends it to students.
export function useSubjectEditsDraft(scope: SubjectScope, base: any[]) {
  const [edits, setEdits] = useState<SubjectEdits>(EMPTY_EDITS);
  const [status, setStatus] = useState<EditsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(edits);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${scope.curriculum}|${scope.grade}|${scope.subject}`;

  useEffect(() => {
    let cancelled = false;
    // data fetching effect — reset before the async fetch below
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getSubjectEdits(scope)
      .then((r) => { if (!cancelled) { setEdits(r.edits); latest.current = r.edits; setStatus(r); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message || 'Could not load your changes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]);

  const save = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setSaving(true);
    try {
      const r = await saveSubjectEdits(scope, latest.current);
      setStatus(r);
      setDirty(false);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  }, [key]);

  const apply = useCallback((op: Op) => {
    const next = op(base, latest.current);
    if (next === latest.current) return;
    latest.current = next;
    setEdits(next);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { save(); }, AUTOSAVE_MS);
  }, [base, save]);

  const publish = useCallback(async () => {
    if (dirty) await save();
    try {
      setStatus(await publishSubjectEdits(scope));
      setError('');
      return true;
    } catch (e: any) {
      setError(e.message || 'Could not publish.');
      return false;
    }
  }, [dirty, save, key]);

  // Leaving the screen with a save still pending: save it now rather than lose it.
  const scopeRef = useRef(scope);
  useEffect(() => { scopeRef.current = scope; }, [scope]);
  useEffect(() => () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    saveSubjectEdits(scopeRef.current, latest.current).catch(() => {});
  }, []);

  return { edits, status, loading, saving, dirty, error, apply, save, publish };
}
