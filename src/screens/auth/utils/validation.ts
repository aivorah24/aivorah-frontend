// Login/Signup form validation — moved out of LandingScreen.tsx so it can be
// unit-tested directly, without rendering the screen. Behavior is unchanged
// from the inline version; same messages, same order of checks.

import type { UserRole } from '../../../context/AuthContext';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Calculate age from DD/MM/YYYY
export function getAge(dobStr: string): number | null {
  const parts = dobStr.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 1900) return null;
  const birth = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function validateLoginForm({ email, pass }: { email: string; pass: string }): ValidationResult {
  const emailTrim = email.replace(/\s+/g, '');
  const passTrim = pass.replace(/\s+/g, '');
  if (!emailTrim || !passTrim) return { valid: false, error: 'Please fill in all fields.' };
  return { valid: true };
}

export function validateSignupForm({
  name,
  email,
  pass,
  role,
  dob,
}: {
  name: string;
  email: string;
  pass: string;
  role: UserRole;
  dob: string;
}): ValidationResult {
  const emailTrim = email.trim();
  const nameTrim = name.trim();

  if (!nameTrim) return { valid: false, error: 'Please enter your full name.' };
  if (!emailTrim) return { valid: false, error: 'Please enter a valid email address.' };
  if (!/^\S+@\S+\.\S+$/.test(emailTrim)) return { valid: false, error: 'Please enter a valid email format.' };
  if (pass.length < 6) return { valid: false, error: 'Password must be at least 6 characters.' };

  if (role === 'student') {
    if (!dob.trim()) return { valid: false, error: 'Please enter your date of birth.' };
    const age = getAge(dob.trim());
    if (age === null) return { valid: false, error: 'Please enter a valid date of birth (DD/MM/YYYY).' };
    if (age < 14) {
      return {
        valid: false,
        error: 'Students under 14 cannot self-register. Please ask your parent or teacher to create your account.',
      };
    }
  }

  return { valid: true };
}
