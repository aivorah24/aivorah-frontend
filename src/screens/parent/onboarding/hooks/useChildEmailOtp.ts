import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ChildEntry } from '../types';
import { sendChildOtp as sendChildOtpRequest, verifyChildOtp as verifyChildOtpRequest } from '../services/onboardingService';

// Inline, code-based verification of a child's real email during onboarding
// (Section 4's optional email field). Depends on the active child from
// useChildrenForm - passed in rather than duplicated here.
export function useChildEmailOtp(
  activeChild: ChildEntry,
  activeChildIdx: number,
  setChildren: Dispatch<SetStateAction<ChildEntry[]>>,
  updateChild: (field: keyof ChildEntry, value: string) => void,
) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Reset the OTP UI when switching between children. Intentional reset
  // keyed on activeChildIdx, not a value derivable at render time.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOtpSent(false); setOtpCode(''); setOtpErr(''); setOtpCooldown(0);
  }, [activeChildIdx]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cooldown countdown for resending.
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  // Editing the email invalidates any prior verification + OTP session.
  const onChildEmailChange = (v: string) => {
    setChildren((prev) => prev.map((c, i) => (i === activeChildIdx ? { ...c, email: v, verifiedEmail: '' } : c)));
    setOtpSent(false); setOtpCode(''); setOtpErr('');
  };

  async function sendOtp() {
    const email = activeChild.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setOtpErr('Enter a valid email first.'); return; }
    setOtpSending(true); setOtpErr('');
    try {
      await sendChildOtpRequest(email, activeChild.name.trim());
      setOtpSent(true); setOtpCooldown(30);
    } catch (e: any) {
      setOtpErr(e?.message || 'Could not send the code. Please try again.');
    } finally { setOtpSending(false); }
  }

  async function verifyOtp() {
    const email = activeChild.email.trim().toLowerCase();
    const code = otpCode.trim();
    if (code.length < 4) { setOtpErr('Enter the 6-digit code.'); return; }
    setOtpVerifying(true); setOtpErr('');
    try {
      await verifyChildOtpRequest(email, code);
      updateChild('verifiedEmail', email);
      setOtpSent(false); setOtpCode('');
    } catch (e: any) {
      setOtpErr(e?.message || 'Incorrect or expired code.');
    } finally { setOtpVerifying(false); }
  }

  const childEmailVal = activeChild.email.trim().toLowerCase();
  const childEmailValid = /^\S+@\S+\.\S+$/.test(childEmailVal);
  const childEmailVerified = childEmailValid && activeChild.verifiedEmail.trim().toLowerCase() === childEmailVal;

  return {
    otpSent, otpCode, setOtpCode, otpErr, otpSending, otpVerifying, otpCooldown,
    onChildEmailChange, sendOtp, verifyOtp,
    childEmailValid, childEmailVerified,
  };
}
