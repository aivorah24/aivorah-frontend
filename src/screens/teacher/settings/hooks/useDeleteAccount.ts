import { useState } from 'react';
import {
  EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential,
  reauthenticateWithPopup, deleteUser,
} from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import { deleteAccount as deleteAccountApi } from '../services/settingsService';

// Provider-aware account deletion: password users confirm with password,
// Google-SSO users confirm via Google popup. The server removes Supabase +
// its own Firebase Auth cleanup; deleteUser(firebaseUser) here handles the
// case where the client's own session still needs cleanup (best-effort —
// "already deleted server-side" is not an error).
export function useDeleteAccount(isPasswordUser: boolean, isGoogleUser: boolean, logout: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function confirmDelete(password: string): Promise<boolean> {
    setError('');
    if (isPasswordUser && !password) { setError('Please enter your password to confirm.'); return false; }
    setLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser && firebaseUser.email) {
        if (isPasswordUser) {
          const cred = EmailAuthProvider.credential(firebaseUser.email, password);
          await reauthenticateWithCredential(firebaseUser, cred);
        } else if (isGoogleUser) {
          await reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider());
        }
        await deleteAccountApi(firebaseUser.email);
        try { await deleteUser(firebaseUser); } catch { /* already deleted server-side */ }
      }
      logout();
      return true;
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setError('Google confirmation was cancelled. Please try again.');
      } else {
        setError('Could not delete account. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, setError, confirmDelete };
}
