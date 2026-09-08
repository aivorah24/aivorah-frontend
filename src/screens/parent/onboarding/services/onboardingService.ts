import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import firebaseApp from '../../../../config/firebase';
import type { ChildEntry } from '../types';

export function generateStudentId(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4) || 'STU';
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `STU-${initials}-${suffix}`;
}

export async function fetchPreferences(email: string) {
  const res = await fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(email)}`);
  return res.ok ? res.json() : null;
}

export async function saveProfile(body: Record<string, unknown>) {
  const res = await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Profile save failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

// Fire-and-forget, matching the original's un-awaited `.catch(() => {})` call.
export function savePreferences(body: Record<string, unknown>) {
  fetch(`${PROFILE_SERVER_URL}/user/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function sendChildOtp(email: string, name: string) {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/children/email-otp/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name: name || 'there' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Could not send the code.');
}

export async function verifyChildOtp(email: string, otp: string) {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/children/email-otp/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.verified) throw new Error(data?.error || 'Incorrect or expired code.');
}

export async function linkExistingChild(parentEmail: string, childEmail: string) {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childEmail: childEmail.toLowerCase() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Could not link the account. Make sure they have a registered Aivorah account.`);
  }
}

interface InitChildAuthResult {
  email: string;
  password: string;
  studentId: string;
  emailProvided: boolean;
}

export async function initChildAuth(params: {
  name: string; studentId: string; email?: string; age?: number; password?: string; parentEmail: string;
}): Promise<InitChildAuthResult> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/children/init-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const init = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(init?.error || `Could not prepare ${params.name}'s account credentials.`);
  return {
    email: String(init.email || '').toLowerCase(),
    password: String(init.password || ''),
    studentId: init.studentId || params.studentId,
    emailProvided: Boolean(init.emailProvided),
  };
}

// Creates the child's real Firebase Auth account via a throwaway secondary
// app instance, so it never disturbs the signed-in parent's own session.
export async function createChildFirebaseAccount(name: string, email: string, password: string) {
  const secondaryName = `onboarding-child-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const childApp = initializeApp((firebaseApp as any).options, secondaryName);
  const childAuth = getAuth(childApp);
  try {
    const childCred = await createUserWithEmailAndPassword(childAuth, email, password);
    await updateProfile(childCred.user, { displayName: `${name}|student` }).catch(() => {});
    return childCred.user.uid;
  } catch (fbErr: any) {
    console.log('[DEBUG child-create error]', JSON.stringify({ code: fbErr?.code, message: fbErr?.message, email }, null, 2));
    if (fbErr?.code === 'auth/email-already-in-use') {
      throw new Error(`${name}'s email already exists. Use another email or leave it blank for auto-generated login.`);
    }
    throw new Error(fbErr?.message || `Could not create ${name}'s account.`);
  } finally {
    await signOut(childAuth).catch(() => {});
    await deleteApp(childApp).catch(() => {});
  }
}

export async function linkCreatedChild(parentEmail: string, params: {
  firebaseUid: string; name: string; studentId: string; email: string;
  grade: string; curriculum: string; school: string; schoolCity: string;
  verificationRequired: boolean; age?: number; initialPassword: string;
}) {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/link-created`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(err?.error || `A child named "${params.name}" with this grade already exists on your account.`);
    }
    throw new Error(err?.error || `Could not create ${params.name}'s account during onboarding.`);
  }
  const created = await res.json().catch(() => null);
  if (!created) throw new Error(`Could not read ${params.name}'s account response. Please try again.`);
  return created.child as { email?: string; studentId?: string } | undefined;
}

// One child from the onboarding form -> either linked (14+, existing
// account) or created (under 14, new account) via the two service calls
// above. Returns credentials to show the parent, or null when linking an
// existing account (nothing new was created, nothing to show).
export async function processChild(parentEmail: string, child: ChildEntry) {
  const cleanName = child.name.trim();
  const ageNum = child.age ? parseInt(child.age, 10) : 0;

  if (ageNum >= 14 && child.linkEmail.trim()) {
    await linkExistingChild(parentEmail, child.linkEmail.trim());
    return null;
  }

  const candidateStudentId = generateStudentId(cleanName);
  const init = await initChildAuth({
    name: cleanName,
    studentId: candidateStudentId,
    email: child.email.trim().toLowerCase() || undefined,
    age: child.age ? parseInt(child.age, 10) : undefined,
    password: child.password.trim() || undefined,
    parentEmail,
  });

  const firebaseUid = await createChildFirebaseAccount(cleanName, init.email, init.password);

  const createdChild = await linkCreatedChild(parentEmail, {
    firebaseUid,
    name: cleanName,
    studentId: init.studentId,
    email: init.email,
    grade: child.grade,
    curriculum: child.curriculum,
    school: child.school,
    schoolCity: child.schoolCity,
    verificationRequired: init.emailProvided,
    age: child.age ? parseInt(child.age, 10) : undefined,
    initialPassword: init.password,
  });

  return {
    name: cleanName,
    loginId: createdChild?.email || init.email,
    password: init.password,
    studentId: createdChild?.studentId || init.studentId,
    verificationRequired: init.emailProvided,
  };
}
