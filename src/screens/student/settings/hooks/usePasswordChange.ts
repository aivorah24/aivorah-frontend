import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';

export function usePasswordChange(user: any, updateUser: (patch: any) => void, closeModal: () => void) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  }

  async function handleChangePassword() {
    setPasswordError('');
    // Strip all whitespace to match the login screen (pass.replace(/\s+/g,'')),
    // so a copy-pasted current password with a stray space still re-authenticates. (#154)
    const curPw = currentPassword.replace(/\s+/g, '');
    const newPw = newPassword.replace(/\s+/g, '');
    const confirmPw = confirmPassword.replace(/\s+/g, '');
    if (!curPw) { setPasswordError('Enter your current password.'); return; }
    if (newPw.length < 6) { setPasswordError('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPasswordError('Passwords do not match.'); return; }
    setModalLoading(true);
    try {
      // auth.currentUser can still be null for a moment after navigating to
      // this screen or reloading - Firebase's onAuthStateChanged rehydrates
      // asynchronously, and the app already gates routing to this screen on
      // isAuthenticated, so the user genuinely IS logged in even though the
      // raw SDK reference hasn't caught up yet. Poll briefly instead of
      // failing immediately - confirmed via network tracing that this races
      // in practice (fresh navigation, not just post-reload).
      let firebaseUser = auth.currentUser;
      for (let waited = 0; !firebaseUser && waited < 5000; waited += 200) {
        await new Promise(r => setTimeout(r, 200));
        firebaseUser = auth.currentUser;
      }
      if (!firebaseUser || !firebaseUser.email) {
        setPasswordError('Your session is still loading. Please wait a moment and try again.');
        return;
      }
      const cred = EmailAuthProvider.credential(firebaseUser.email, curPw);
      await reauthenticateWithCredential(firebaseUser, cred);
      await updatePassword(firebaseUser, newPw);
      if (user?.mustChangePassword) {
        // Was the monolith's /user/clear-must-change-password - it writes to a
        // different Supabase project than /user/sync reads mustChangePassword
        // from, so it never actually cleared the flag anywhere that mattered.
        // See SetPasswordScreen.tsx's matching fix for the full bug.
        fetch(`${PROFILE_SERVER_URL}/user/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: firebaseUser.email, mustChangePassword: false }),
        }).catch(() => {});
        updateUser({ mustChangePassword: false });
      }
      closeModal();
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.');
      } else {
        setPasswordError(e.message || 'Failed to change password.');
      }
    } finally {
      setModalLoading(false);
    }
  }

  return {
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    showCurrent, setShowCurrent,
    showNew, setShowNew,
    passwordError, modalLoading,
    handleChangePassword,
    resetForm,
  };
}
