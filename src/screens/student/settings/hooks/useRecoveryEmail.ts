import { useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';

export function useRecoveryEmail(userEmail: string | undefined, closeModal: () => void) {
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySaved, setRecoverySaved] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'otp'>('email');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoverySending, setRecoverySending] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  function resetForm() {
    setRecoveryEmail('');
    setRecoveryError('');
    setRecoveryStep('email');
    setRecoveryOtp('');
  }

  async function handleSendRecoveryCode() {
    setRecoveryError('');
    if (!recoveryEmail.trim()) { setRecoveryError('Please enter a recovery email.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail.trim())) { setRecoveryError('Please enter a valid email address.'); return; }
    setRecoverySending(true);
    try {
      const res = await fetch(`${SERVER_URL}/user/recovery-email/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, recoveryEmail: recoveryEmail.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setRecoveryError(d.error || 'Failed to send code.'); return; }
      setRecoveryStep('otp');
    } catch {
      setRecoveryError('Network error. Please try again.');
    } finally {
      setRecoverySending(false);
    }
  }

  async function handleVerifyRecoveryOtp() {
    setRecoveryError('');
    if (!recoveryOtp.trim()) { setRecoveryError('Please enter the verification code.'); return; }
    setModalLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/user/recovery-email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp: recoveryOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRecoveryError(data.error || 'Verification failed.'); return; }
      closeModal();
      setRecoverySaved(data.recoveryEmail || recoveryEmail.trim());
    } catch {
      setRecoveryError('Network error. Please try again.');
    } finally {
      setModalLoading(false);
    }
  }

  return {
    recoveryEmail, setRecoveryEmail, recoveryError, setRecoveryError,
    recoverySaved, setRecoverySaved, recoveryStep, setRecoveryStep,
    recoveryOtp, setRecoveryOtp, recoverySending, modalLoading,
    handleSendRecoveryCode, handleVerifyRecoveryOtp,
    resetForm,
  };
}
