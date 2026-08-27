import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../../../config/firebase';

// Pure Firebase Auth operation — no backend call at all, unlike every other
// account-settings flow in this feature (there's no server-side password
// store to update; Firebase IS the password store).
export function usePasswordChange() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> {
    setError('');
    // Strip all whitespace to match the login screen (pass.replace(/\s+/g,'')),
    // so a copy-pasted current password with a stray space still re-authenticates.
    const curPwClean = (currentPassword || '').replace(/\s+/g, '');
    const newPwClean = (newPassword || '').replace(/\s+/g, '');
    const confirmPwClean = (confirmPassword || '').replace(/\s+/g, '');
    if (!curPwClean) { setError('Enter your current password.'); return false; }
    if (newPwClean.length < 6) { setError('New password must be at least 6 characters.'); return false; }
    if (newPwClean !== confirmPwClean) { setError('Passwords do not match.'); return false; }

    setSaving(true);
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser && firebaseUser.email) {
        const cred = EmailAuthProvider.credential(firebaseUser.email, curPwClean);
        await reauthenticateWithCredential(firebaseUser, cred);
        await updatePassword(firebaseUser, newPwClean);
      }
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to change password.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, setError, changePassword };
}
