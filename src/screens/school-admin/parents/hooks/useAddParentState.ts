import { useCallback, useEffect, useState } from 'react';
import {
  schoolAdminParentsService, CreateParentResult, CreateParentError, ExistingParent, LinkChildrenResult,
} from '../services/schoolAdminParentsService';
import { ChildEntry, newChildEntry, childrenToPayload } from '../utils/childEntry';

export interface UnresolvedChild { index: number; reason: string }

export function useAddParentState(email: string | undefined) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<ChildEntry[]>([newChildEntry()]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [unresolved, setUnresolved] = useState<UnresolvedChild[]>([]);
  const [result, setResult] = useState<CreateParentResult | null>(null);
  const [existingParent, setExistingParent] = useState<ExistingParent | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState<LinkChildrenResult | null>(null);

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
    setFirstName(''); setLastName(''); setParentEmail(''); setPhone('');
    setChildren([newChildEntry()]);
    setSubmitting(false); setFormError(''); setUnresolved([]); setResult(null);
    setExistingParent(null); setLinking(false); setLinkResult(null);
  }, []);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  // A changed email invalidates a previous "link to existing parent" offer.
  const changeParentEmail = useCallback((v: string) => { setParentEmail(v); setExistingParent(null); }, []);

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
    setExistingParent(null);
    try {
      const childPayload = childrenToPayload(children);
      const payload: any = { firstName: firstName.trim(), lastName: lastName.trim() };
      // Blank → the server generates a login ID; never send an empty string.
      if (parentEmail.trim()) payload.email = parentEmail.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (childPayload.length > 0) payload.children = childPayload;

      const data = await schoolAdminParentsService.createParent(email, payload);
      setResult(data);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to add parent');
      if (e instanceof CreateParentError) {
        setUnresolved(e.unresolved);
        setExistingParent(e.existingParent);
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, canSubmit, submitting, firstName, lastName, parentEmail, phone, children]);

  // "Link instead" — attach the entered children to the parent who already owns the email.
  const canLinkExisting = !!existingParent && childrenToPayload(children).length > 0;
  const linkToExisting = useCallback(async () => {
    if (!email || !existingParent || linking) return;
    const payload = childrenToPayload(children);
    if (payload.length === 0) return;
    setLinking(true);
    setUnresolved([]);
    try {
      setLinkResult(await schoolAdminParentsService.linkChildren(email, existingParent.id, payload));
      setFormError('');
    } catch (e: any) {
      setFormError(e?.message || 'Failed to link child');
      if (e instanceof CreateParentError) setUnresolved(e.unresolved);
    } finally {
      setLinking(false);
    }
  }, [email, existingParent, linking, children]);

  return {
    firstName, setFirstName, lastName, setLastName, parentEmail, setParentEmail: changeParentEmail, phone, setPhone, children,
    submitting, formError, unresolved, result,
    existingParent, canLinkExisting, linking, linkResult, linkToExisting,
    sectionsByGrade, allSections, schoolCurriculumBase, openDropdown, setOpenDropdown,
    canSubmit, updateChild, addChild, removeChild, submit, reset,
  };
}
