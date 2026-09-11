import { useState } from 'react';
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser } from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import AUTH_SERVER_URL from '../../../../config/authServerUrl';

export function useDeleteAccount(isPasswordUser: boolean, isGoogleUser: boolean, logout: () => void) {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function openDeleteModal() {
    setDeletePassword('');
    setDeleteError('');
    setDeleteModalVisible(true);
  }

  async function confirmDeleteAccount() {
    setDeleteError('');
    // Password accounts confirm with their password; Google SSO accounts re-confirm
    // with the Google popup (they have no password to enter).
    if (isPasswordUser && !deletePassword) { setDeleteError('Please enter your password to confirm.'); return; }
    setDeleteLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser && firebaseUser.email) {
        // Re-authenticate (required by Firebase for account deletion)
        if (isPasswordUser) {
          const cred = EmailAuthProvider.credential(firebaseUser.email, deletePassword);
          await reauthenticateWithCredential(firebaseUser, cred);
        } else if (isGoogleUser) {
          await reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider());
        }
        // Delete from Supabase + Firebase Auth (server uses the Admin SDK, so this
        // works for any provider). Client deleteUser below is just a best-effort
        // fallback and must not block the flow if the server already removed it.
        await fetch(`${AUTH_SERVER_URL}/user/delete-account`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: firebaseUser.email }),
        });
        try { await deleteUser(firebaseUser); } catch (_) { /* already deleted server-side */ }
      }
      logout();
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setDeleteError('Google confirmation was cancelled. Please try again.');
      } else {
        setDeleteError('Could not delete account. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  return {
    deleteModalVisible, setDeleteModalVisible, openDeleteModal,
    deletePassword, setDeletePassword, deleteLoading, deleteError, setDeleteError,
    confirmDeleteAccount,
  };
}
