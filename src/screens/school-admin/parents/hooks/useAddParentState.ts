import { useCallback, useEffect, useState } from 'react';
import { schoolAdminParentsService, CreateParentResult, CreateParentError } from '../services/schoolAdminParentsService';
import { ChildEntry, newChildEntry, childrenToPayload } from '../utils/childEntry';

export interface UnresolvedChild { index: number; reason: string }

export function useAddParentState(email: string | undefined) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<ChildEntry[]>([newChildEntry()]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [unresolved, setUnresolved] = useState<UnresolvedChild[]>([]);
  const [result, setResult] = useState<CreateParentResult | null>(null);

  const [sectionsByGrade, setSectionsByGrade] = useState<Record<string, string[]>>({});
  const [allSections, setAllSections] = useState<string[]>([]);
  const [schoolCurriculumBase, setSchoolCurriculumBase] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email) return;
      try {
        const opts = await schoolAdminParentsService.getGradeSectionOptions(email);
        if (cancelled) return;
        setSectionsByGrade(opts.sectionsByGrade);
        setAllSections(opts.allSections);
        setSchoolCurriculumBase(opts.schoolCurriculumBase);
      } catch {
        // Non-fatal — dropdowns fall back to the full unfiltered lists.
      }
    })();
    return () => { cancelled = true; };
  }, [email]);

  const reset = useCallback(() => {
    setFirstName(''); setLastName(''); setPhone('');
    setChildren([newChildEntry()]);
    setSubmitting(false); setFormError(''); setUnresolved([]); setResult(null);
  }, []);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  function updateChild(key: string, patch: Partial<ChildEntry>) {
    setChildren((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function addChild() {
    setChildren((prev) => [...prev, newChildEntry()]);
  }
  function removeChild(key: string) {
    setChildren((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.key !== key)));
  }

  const submit = useCallback(async () => {
    if (!email || !canSubmit || submitting) return;
    setSubmitting(true);
    setFormError('');
    setUnresolved([]);
    try {
      const childPayload = childrenToPayload(children);
      const payload: any = { firstName: firstName.trim(), lastName: lastName.trim() };
      if (phone.trim()) payload.phone = phone.trim();
      if (childPayload.length > 0) payload.children = childPayload;

      const data = await schoolAdminParentsService.createParent(email, payload);
      setResult(data);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to add parent');
      if (e instanceof CreateParentError) setUnresolved(e.unresolved);
    } finally {
      setSubmitting(false);
    }
  }, [email, canSubmit, submitting, firstName, lastName, phone, children]);

  return {
    firstName, setFirstName, lastName, setLastName, phone, setPhone, children,
    submitting, formError, unresolved, result,
    sectionsByGrade, allSections, schoolCurriculumBase, openDropdown, setOpenDropdown,
    canSubmit, updateChild, addChild, removeChild, submit, reset,
  };
}
