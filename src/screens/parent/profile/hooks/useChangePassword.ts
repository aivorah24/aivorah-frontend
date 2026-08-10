import { useState } from 'react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export function useChangePassword(email: string) {
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  function openPassModal() {
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
    setPassError(''); setPassSuccess(false);
    setPassModalVisible(true);
  }

  async function handleChangePassword() {
    // Strip all whitespace to match the login screen (pass.replace(/\s+/g,'')),
    // so a copy-pasted current password with a stray space still re-authenticates. (#154)
    const curPw = (currentPass || '').replace(/\s+/g, '');
    const newPw = (newPass || '').replace(/\s+/g, '');
    const confirmPw = (confirmPass || '').replace(/\s+/g, '');
    if (!newPw || newPw.length < 6) { setPassError('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPassError('Passwords do not match.'); return; }
    setPassLoading(true); setPassError('');
    try {
      const firebaseAuth = getAuth();
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) throw new Error('Not logged in');
      const credential = EmailAuthProvider.credential(email, curPw);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPw);
      setPassSuccess(true);
      setTimeout(() => setPassModalVisible(false), 1500);
    } catch (err: any) {
      const msg = err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : 'Could not update password. Please try again.';
      setPassError(msg);
    }
    setPassLoading(false);
  }

  return {
    passModalVisible, setPassModalVisible,
    currentPass, setCurrentPass, newPass, setNewPass, confirmPass, setConfirmPass,
    passError, passSuccess, passLoading,
    openPassModal, handleChangePassword,
  };
}
