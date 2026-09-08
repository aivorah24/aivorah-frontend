import { useRef, useState } from 'react';
import { Platform, Share } from 'react-native';
import { useAuth, getPendingReturnRole } from '../../../../context/AuthContext';
import { resolveOnboardingSaveResult } from '../../../onboarding/utils/resolveOnboardingSaveResult';
import { saveProfile, savePreferences, processChild } from '../services/onboardingService';
import type { ChildEntry, ChildCredential } from '../types';

interface CompletionInput {
  fullName: string; city: string; dob: string; mobile: string; mobileCode: string;
  stateProv: string; country: string; avatarStyle: string; children: ChildEntry[];
  mobileVerified: boolean; verifiedMobile: string;
  requiredDone: boolean; addingChildren: boolean;
}

// Owns the "Complete Setup" / "Save & go back" flow end to end: validation,
// the profile + preferences PATCHes, per-child account creation/linking
// (via services/onboardingService's processChild), and the resulting
// credentials modal.
export function useOnboardingSubmit(input: CompletionInput) {
  const { user, updateUser, logout, cancelAddParentProfile } = useAuth();
  const isAddingParent = getPendingReturnRole() === 'teacher';

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showChildCreds, setShowChildCreds] = useState(false);
  const [createdChildCreds, setCreatedChildCreds] = useState<ChildCredential[]>([]);
  const [copiedField, setCopiedField] = useState('');
  const pendingPatchRef = useRef<any | null>(null);

  const {
    fullName, city, dob, mobile, mobileCode, stateProv, country, avatarStyle, children,
    mobileVerified, verifiedMobile, requiredDone, addingChildren,
  } = input;

  // finalize=false is the "Save & go back" path (dual-role: teacher pausing
  // partway through adding a parent profile) — it persists the fields entered
  // so far but must NOT grant the parent role/switch-profile access, since the
  // user hasn't confirmed via "Complete Setup". Only finalize=true (the real
  // Complete Setup button) is allowed to flip role/roles/onboarding_complete.
  async function handleFinish(finalize: boolean = true) {
    if (finalize && !requiredDone) {
      setSaveError(addingChildren
        ? 'Please finish the child details you started (curriculum, grade and account), or remove that child to skip.'
        : 'Please complete your Personal Info to continue.');
      return;
    }
    if (finalize && mobile.trim()) {
      const digits = mobile.replace(/\D/g, '');
      const minDigits = mobileCode === '+91' ? 10 : 7;
      if (digits.length < minDigits) {
        setSaveError(`Mobile number must have at least ${minDigits} digits.`);
        return;
      }
      // Verification is optional here — it can be completed later from Settings.
    }
    setSaving(true);
    setSaveError('');
    try {
      const email = user?.email || '';

      const body: any = {
        email,
        name: fullName.trim(),
        school: children[0]?.school || '',
        location: city,
        ...(finalize ? { role: 'parent', complete: true } : {}),
        children: children
          .filter((c) => {
            const age = c.age ? parseInt(c.age, 10) : 0;
            return age < 14 && c.name.trim();
          })
          .map((c) => ({
            name: c.name.trim(),
            grade: c.grade,
            school: c.school,
            schoolCity: c.schoolCity,
            curriculum: c.curriculum,
            email: c.email.trim().toLowerCase() || undefined,
          })),
      };

      const saved = await saveProfile(body);
      // Trust the server's own onboardingComplete field on a real finalize
      // rather than assuming success from a 200 status — see
      // BUGS_AND_FIXES.md Bug #1. A "Save & go back" draft never sends
      // complete:true, so it's exempt from this check (handled by the early
      // `!finalize` return below, before onboardingComplete is ever set).
      const saveResult = finalize ? resolveOnboardingSaveResult(saved) : null;
      if (finalize && !saveResult!.ok) {
        throw new Error(saveResult!.error);
      }

      // Only grant the parent role/switch-profile access on a real "Complete
      // Setup" (finalize) — a "Save & go back" must not add "parent" to roles.
      const mergedRoles = finalize
        ? (getPendingReturnRole() === 'teacher' ? ['teacher', 'parent'] : ['parent'])
        : undefined;

      savePreferences({
        email,
        name: fullName.trim(),
        ...(finalize ? { role: 'parent' } : {}),
        location: city,
        state: stateProv || undefined,
        country: country || undefined,
        dob: dob || undefined,
        mobile: mobile ? `${mobileCode} ${mobile}` : undefined,
        mobileVerified: mobile ? (mobileVerified && mobile === verifiedMobile) : undefined,
        avatarStyle,
        ...(mergedRoles ? { roles: mergedRoles } : {}),
      });

      // ── Draft "Save & go back" (teacher pausing parent onboarding) ──────────
      // The entered fields are now persisted (above), but we must NOT create
      // child accounts or grant the parent role. Restore the teacher session so
      // the app routes back to the teacher DASHBOARD — beginAddParentProfile had
      // forced onboardingComplete=false to show parent onboarding, so without
      // this restore we'd land back on teacher ONBOARDING instead.
      if (!finalize) {
        if (isAddingParent) {
          cancelAddParentProfile();
        } else {
          await logout();
        }
        return;
      }

      const localCompletionPatch: any = {
        name: fullName.trim(),
        location: city,
        avatarStyle,
        role: getPendingReturnRole() === 'teacher' ? 'teacher' : 'parent',
        activeRole: getPendingReturnRole() === 'teacher' ? 'teacher' : 'parent',
        onboardingComplete: saveResult!.onboardingComplete,
        roles: mergedRoles,
      };

      // ── Child account handling ─────────────────────────────────────
      const allCreds: ChildCredential[] = [];
      for (const child of children) {
        if (!child.name.trim()) continue;
        const cred = await processChild(email, child);
        if (cred) allCreds.push(cred);
      }

      if (allCreds.length > 0) {
        setCreatedChildCreds(allCreds);
        setShowChildCreds(true);
        // updateUser is applied once the parent acknowledges the credentials modal.
        pendingPatchRef.current = localCompletionPatch;
        return;
      }

      updateUser(localCompletionPatch as any);
    } catch (err: any) {
      console.error('Onboarding save error:', err);
      setSaveError(err?.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function confirmChildCredsAndFinish() {
    setShowChildCreds(false);
    if (pendingPatchRef.current) {
      updateUser(pendingPatchRef.current);
      pendingPatchRef.current = null;
    }
  }

  function copyToClipboard(text: string, field: string) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  }

  // Native share sheet (WhatsApp, SMS, mail, etc.) instead of a mail-only
  // "forward" link — on web, uses the Web Share API where available and
  // falls back to a WhatsApp click-to-chat link on desktop browsers that
  // don't support navigator.share.
  async function shareCredentials(cred: { name: string; loginId: string; password: string }) {
    const text = `Hi ${cred.name},\n\nHere are your Aivorah login details:\n\nLogin ID: ${cred.loginId}\nPassword: ${cred.password}\n\nLog in at https://aivorah.ai`;
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        try { await nav.share({ title: 'Aivorah Login Details', text }); return; } catch { return; }
      }
      if (typeof window !== 'undefined') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      return;
    }
    try { await Share.share({ message: text }); } catch {}
  }

  return {
    isAddingParent, saving, saveError, showChildCreds, createdChildCreds, copiedField,
    handleFinish, confirmChildCredsAndFinish, copyToClipboard, shareCredentials,
  };
}
