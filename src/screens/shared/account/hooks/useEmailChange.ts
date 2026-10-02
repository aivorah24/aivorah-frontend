import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import * as api from '../services/accountApi';
import { pickGoogleAccount } from '../services/googlePicker';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type EmailChangeStep = 'form' | 'otp' | 'done';

const popupCancelled = (e: any) => e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request';

/**
 * Change Email for every persona.
 * - Password accounts: new email + current password → code sent to the new email → verify.
 * - Google accounts: pick a different Google account; the server moves the account onto it.
 * Ends in step 'done': the session still holds the old identity, so the user must sign in again.
 */
export function useEmailChange({ email, name, isGoogleUser }: { email?: string; name?: string; isGoogleUser: boolean }) {
  const [step, setStep] = useState<EmailChangeStep>('form');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const current = (email || '').toLowerCase();
  const target = newEmail.trim().toLowerCase();

  function reset() {
    setStep('form'); setNewEmail(''); setPassword(''); setOtp('');
    setError(''); setInfo(''); setLoading(false); setDoneMessage('');
  }

  function backToForm() { setStep('form'); setOtp(''); setError(''); setInfo(''); }

  async function run(fn: () => Promise<void>) {
    setError(''); setInfo(''); setLoading(true);
    try { await fn(); } finally { setLoading(false); }
  }

  async function sendOtp() {
    if (!target) { setError('Please enter your new email.'); return; }
    if (!EMAIL_RE.test(target)) { setError('Please enter a valid email address.'); return; }
    if (target === current) { setError('That is already your current email.'); return; }
    if (isGoogleUser) {
      setError('This account signs in with Google, so its email is your Google account. Use "Switch Google Account" instead.');
      return;
    }
    if (!password) { setError('Please enter your current password.'); return; }
    await run(async () => {
      try {
        if (await api.isEmailTaken(target)) { setError('That email is already registered to another Aivorah account.'); return; }
        const fu = auth.currentUser;
        if (fu?.email) await reauthenticateWithCredential(fu, EmailAuthProvider.credential(fu.email, password));
        await api.sendEmailOtp(target, name);
        setStep('otp');
      } catch (e: any) {
        setError(e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
          ? 'Incorrect password. Please try again.'
          : e?.message || 'Failed to send verification code.');
      }
    });
  }

  async function resendOtp() {
    await run(async () => {
      try {
        await api.sendEmailOtp(target, name);
        setInfo(`A new code was sent to ${newEmail.trim()}.`);
      } catch (e: any) {
        setError(e?.message || 'Failed to resend code.');
      }
    });
  }

  async function verifyOtp() {
    if (!otp.trim()) { setError('Please enter the code.'); return; }
    await run(async () => {
      try {
        await api.changeEmail(current, target, otp.trim());
        setDoneMessage(`Your email has been changed to ${target}. For security, please sign in again with your new email.`);
        setStep('done');
      } catch (e: any) {
        setError(e?.message || 'Failed to update email.');
      }
    });
  }

  async function switchGoogleAccount() {
    await run(async () => {
      try {
        // Picked on a separate sign-in, so the current session stays on this account.
        const { email: picked, idToken } = await pickGoogleAccount();
        if (!picked) throw new Error('That Google account has no email address.');
        if (picked === current) throw new Error('That is the same Google account you already use. Pick a different one.');
        if (await api.isEmailTaken(picked)) {
          throw new Error(`${picked} is already registered with another Aivorah account. Pick a Google account that isn't used on Aivorah.`);
        }
        const d = await api.changeEmailGoogle(current, idToken);
        setDoneMessage(`Your account is now linked to ${d.newEmail || picked}. For security, please sign in again with your new Google account.`);
        setStep('done');
      } catch (e: any) {
        setError(popupCancelled(e) ? 'Google selection was cancelled. Please try again.' : e?.message || 'Failed to switch Google account.');
      }
    });
  }

  return {
    step, newEmail, setNewEmail, password, setPassword, otp, setOtp,
    error, info, loading, doneMessage, isGoogleUser,
    reset, backToForm, sendOtp, resendOtp, verifyOtp, switchGoogleAccount,
  };
}

export type EmailChange = ReturnType<typeof useEmailChange>;
