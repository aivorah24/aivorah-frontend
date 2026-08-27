import { useState } from 'react';
import {
  EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential,
  reauthenticateWithPopup, signInWithPopup,
} from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import { checkEmailTaken, sendEmailOtp, changeEmail as changeEmailApi, changeEmailGoogle as changeEmailGoogleApi } from '../services/settingsService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password-account email change: reauth -> send OTP to the NEW address ->
// verify OTP -> server renames everywhere. Google-SSO accounts never reach
// this path — a Google account's identity is its provider link, which the
// Admin SDK can't re-point, so they "change email" by switching to a
// DIFFERENT Google account instead (switchGoogleAccount below).
export function useEmailChange(currentEmail: string | undefined, name: string | undefined, isPasswordUser: boolean, isGoogleUser: boolean) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setStep('form');
    setLoading(false);
    setError('');
  }

  async function sendOtp(newEmail: string, currentPassword: string): Promise<boolean> {
    setError('');
    const email = newEmail.trim().toLowerCase();
    if (!email) { setError('Please enter your new email.'); return false; }
    if (!EMAIL_RE.test(email)) { setError('Please enter a valid email address.'); return false; }
    if (email === (currentEmail || '').toLowerCase()) { setError('That is already your current email.'); return false; }
    if (isPasswordUser && !currentPassword) { setError('Please enter your current password.'); return false; }

    setLoading(true);
    try {
      const taken = await checkEmailTaken(email);
      if (taken) { setError('That email is already registered to another Aivorah account.'); return false; }

      const firebaseUser = auth.currentUser;
      if (firebaseUser && firebaseUser.email) {
        if (isPasswordUser) {
          const cred = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
          await reauthenticateWithCredential(firebaseUser, cred);
        } else if (isGoogleUser) {
          await reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider());
        }
      }

      const result = await sendEmailOtp(email, name);
      if (result.error) { setError(result.error); return false; }

      setStep('otp');
      return true;
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setError('Google confirmation was cancelled. Please try again.');
      } else {
        setError(e.message || 'Failed to send verification code.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Resend, unlike the initial sendOtp, does NOT re-run reauth or the
  // taken-email check — the user already cleared those to reach the OTP
  // step; resending is just "call the send endpoint again for this email".
  async function resendOtp(newEmail: string): Promise<{ ok: boolean; message?: string }> {
    setError('');
    const email = newEmail.trim().toLowerCase();
    const result = await sendEmailOtp(email, name);
    if (result.error) { setError(result.error); return { ok: false }; }
    return { ok: true, message: `A new code was sent to ${newEmail.trim()}.` };
  }

  async function verifyOtp(newEmail: string, otp: string): Promise<{ ok: boolean; newEmail?: string }> {
    setError('');
    if (!otp.trim()) { setError('Please enter the code.'); return { ok: false }; }
    setLoading(true);
    try {
      const changedTo = newEmail.trim().toLowerCase();
      const result = await changeEmailApi(currentEmail || '', changedTo, otp.trim());
      if (result.error) { setError(result.error); return { ok: false }; }
      return { ok: true, newEmail: changedTo };
    } catch (e: any) {
      setError(e.message || 'Failed to update email.');
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  async function switchGoogleAccount(): Promise<{ ok: boolean; newEmail?: string }> {
    setError('');
    setLoading(true);
    try {
      const current = (currentEmail || '').toLowerCase();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const newEmailAddr = (result.user.email || '').toLowerCase();
      if (!newEmailAddr) throw new Error('That Google account has no email address.');
      if (newEmailAddr === current) throw new Error('That is the same Google account you already use. Pick a different one.');

      const idToken = await result.user.getIdToken();
      const apiResult = await changeEmailGoogleApi(current, idToken);
      if (apiResult.error) { setError(apiResult.error); return { ok: false }; }

      return { ok: true, newEmail: apiResult.newEmail || newEmailAddr };
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setError('Google selection was cancelled. Please try again.');
      } else {
        setError(e.message || 'Failed to switch Google account.');
      }
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  return { step, loading, error, setError, reset, sendOtp, resendOtp, verifyOtp, switchGoogleAccount };
}
