import { useState } from 'react';
import { Alert } from 'react-native';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import SERVER_URL from '../../../../config/serverUrl';
import AUTH_SERVER_URL from '../../../../config/authServerUrl';

export function useEmailChange(user: any, isGoogleUser: boolean, isPasswordUser: boolean, closeModal: () => void, logout: () => void) {
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailStep, setEmailStep] = useState<'form' | 'otp'>('form');
  const [emailOtp, setEmailOtp] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  function resetForm() {
    setNewEmail('');
    setEmailPassword('');
    setEmailStep('form');
    setEmailOtp('');
    setEmailError('');
  }

  // Step 1: confirm identity (password reauth, or Google popup for SSO accounts
  // which have no password) then email a verification code to the NEW address
  // so we know the student actually owns it before anything changes.
  async function handleSendEmailOtp() {
    setEmailError('');
    const email = newEmail.trim().toLowerCase();
    if (!email) { setEmailError('Please enter your new email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Please enter a valid email address.'); return; }
    if (email === (user?.email || '').toLowerCase()) { setEmailError('That is already your current email.'); return; }
    // Google-SSO accounts can't change email here: the identity is the linked
    // Google account, which the server can't re-point (see /change-email guard).
    // Block up front so the user isn't walked through an OTP flow that would fail.
    if (isGoogleUser) {
      setEmailError('This account signs in with Google, so its email is tied to your Google account and can’t be changed here. To use a different address, sign in with that Google account instead.');
      return;
    }
    if (isPasswordUser && !emailPassword) { setEmailError('Please enter your current password.'); return; }
    setModalLoading(true);
    try {
      // Fail fast if that email already belongs to another Aivorah account —
      // check BEFORE asking for a password/Google popup, so the user isn't
      // walked through a whole reauth + OTP flow just to be blocked at the end.
      const takenRes = await fetch(`${AUTH_SERVER_URL}/user/role?email=${encodeURIComponent(email)}`);
      if (takenRes.ok) {
        setEmailError('That email is already registered to another Aivorah account.');
        setModalLoading(false);
        return;
      }
      const fu = auth.currentUser;
      if (fu && fu.email) {
        if (isPasswordUser) {
          const cred = EmailAuthProvider.credential(fu.email, emailPassword);
          await reauthenticateWithCredential(fu, cred);
        } else if (isGoogleUser) {
          await reauthenticateWithPopup(fu, new GoogleAuthProvider());
        }
      }
      const res = await fetch(`${SERVER_URL}/user/email-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: user?.name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not send the verification code.');
      setEmailStep('otp');
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setEmailError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setEmailError('Google confirmation was cancelled. Please try again.');
      } else {
        setEmailError(e.message || 'Failed to send verification code.');
      }
    } finally {
      setModalLoading(false);
    }
  }

  // Step 2: verify the code and commit the rename everywhere the email is used
  // as a key (users table, email-keyed tables, Supabase Auth, Firebase Auth).
  async function handleVerifyEmailOtp() {
    setEmailError('');
    if (!emailOtp.trim()) { setEmailError('Please enter the code.'); return; }
    setModalLoading(true);
    try {
      const changedTo = newEmail.trim().toLowerCase();
      const res = await fetch(`${SERVER_URL}/user/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail: user?.email, newEmail: changedTo, otp: emailOtp.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not update your email.');
      // The server just renamed this account's email in Firebase Auth via Admin
      // SDK — the browser's current Firebase session still carries the OLD email,
      // so the next background auth check would find no matching account and
      // (wrongly) treat it as a deletion. Sign out deliberately, with a clear
      // message, rather than let that guard do it silently and confusingly.
      closeModal();
      Alert.alert('Email Updated', `Your email has been changed to ${changedTo}. For security, please sign in again with your new email.`);
      setTimeout(() => { logout(); }, 150);
    } catch (e: any) {
      setEmailError(e.message || 'Failed to update email.');
    } finally {
      setModalLoading(false);
    }
  }

  async function handleResendEmailOtp() {
    setEmailError('');
    try {
      const res = await fetch(`${SERVER_URL}/user/email-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase(), name: user?.name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not resend the code.');
      Alert.alert('Code Resent', `A new code was sent to ${newEmail.trim()}.`);
    } catch (e: any) {
      setEmailError(e.message || 'Failed to resend code.');
    }
  }

  // Google-SSO "change email" = migrate the account onto a DIFFERENT Google
  // account the user owns. There's no typed email or OTP: the user proves
  // ownership by picking the destination account in a Google popup, and the
  // server moves all data onto it (see POST /user/change-email-google).
  async function handleSwitchGoogleAccount() {
    setEmailError('');
    setModalLoading(true);
    try {
      const currentEmail = (user?.email || '').toLowerCase();
      const provider = new GoogleAuthProvider();
      // Force the account chooser so the user can pick a DIFFERENT account than
      // the one already cached in the browser.
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const gEmail = (result.user.email || '').toLowerCase();
      if (!gEmail) throw new Error('That Google account has no email address.');
      if (gEmail === currentEmail) throw new Error('That is the same Google account you already use. Pick a different one.');

      const idToken = await result.user.getIdToken();
      const res = await fetch(`${SERVER_URL}/user/change-email-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail, idToken }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not switch your Google account.');

      // Data now lives under the new address and the old Firebase user is gone.
      // Sign out so the session re-establishes cleanly under the new account.
      closeModal();
      Alert.alert('Email Updated', `Your account is now linked to ${d.newEmail || gEmail}. For security, please sign in again with your new Google account.`);
      setTimeout(() => { logout(); }, 150);
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setEmailError('Google selection was cancelled. Please try again.');
      } else {
        setEmailError(e.message || 'Failed to switch Google account.');
      }
    } finally {
      setModalLoading(false);
    }
  }

  return {
    newEmail, setNewEmail, emailPassword, setEmailPassword, emailError,
    emailStep, setEmailStep, emailOtp, setEmailOtp, modalLoading,
    handleSendEmailOtp, handleVerifyEmailOtp, handleResendEmailOtp, handleSwitchGoogleAccount,
    resetForm,
  };
}
