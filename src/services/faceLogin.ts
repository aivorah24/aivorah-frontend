/**
 * Face login - passkeys (WebAuthn) unlocked by the device's own face or
 * fingerprint check (Face ID, Windows Hello, Android). The check never leaves
 * the device; aivorah-auth-service /user/passkeys keeps only a public key and,
 * after a successful face login, returns a Firebase custom token we sign in with.
 *
 * Web only for now: the native app has no passkey support built in.
 */
import { Platform } from 'react-native';
import {
  browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication, startRegistration,
} from '@simplewebauthn/browser';
import AUTH_SERVER_URL from '../config/authServerUrl';
import { authHeader } from './authHeader';

const BASE = `${AUTH_SERVER_URL}/user/passkeys`;

export interface FaceLogin { id: string; deviceLabel: string | null; createdAt: string; lastUsedAt: string | null }

/** True when this browser + device can do face / fingerprint passkeys. */
export async function faceLoginAvailable(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

/** A friendly message for the browser's / server's errors. */
export function faceLoginErrorMessage(err: any): string {
  const name = err?.name || err?.cause?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') return 'Face login was cancelled or timed out. Please try again.';
  if (name === 'InvalidStateError') return 'Face login is already set up on this device.';
  if (name === 'SecurityError') return 'Face login is not available on this website address.';
  return err?.message || 'Face login did not work. Please try again.';
}

async function post<T>(path: string, body: unknown, signedIn: boolean): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(signedIn ? await authHeader() : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Face login did not work. Please try again.'), { code: data?.code });
  return data as T;
}

/** "Windows · Chrome", "iPhone · Safari" - so the user can tell their devices apart. */
export function deviceLabel(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'This device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${os} · ${browser}` : os;
}

/** Sign in: the device asks for the face / fingerprint, then we sign in to Firebase. */
export async function signInWithFace(): Promise<void> {
  const { options, challengeToken } = await post<any>('/login/options', {}, false);
  const response = await startAuthentication({ optionsJSON: options });
  const { token } = await post<{ token: string }>('/login', { response, challengeToken }, false);
  // Firebase loaded lazily, same as authHeader, so importing this file stays light.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { signInWithCustomToken } = require('firebase/auth');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { auth } = require('../config/firebase');
  await signInWithCustomToken(auth, token);
}

/** Add face login for the signed-in user on this device. */
export async function addFaceLogin(): Promise<void> {
  const { options, challengeToken } = await post<any>('/register/options', {}, true);
  const response = await startRegistration({ optionsJSON: options });
  await post('/register', { response, challengeToken, deviceLabel: deviceLabel() }, true);
}

export async function listFaceLogins(): Promise<FaceLogin[]> {
  const res = await fetch(BASE, { headers: await authHeader() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Could not load your face logins');
  return Array.isArray(data.passkeys) ? data.passkeys : [];
}

export async function removeFaceLogin(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: await authHeader() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Could not remove face login');
  }
}

// Sign-up "Add face login" choice, carried to the Verify Email screen (where
// the user is signed in and can tap to set it up).
const OFFER_KEY = 'aivorah_offer_face_login';
export function rememberFaceLoginOffer(on: boolean) {
  try { if (on) sessionStorage.setItem(OFFER_KEY, '1'); else sessionStorage.removeItem(OFFER_KEY); } catch { /* no storage */ }
}
export function faceLoginOffered(): boolean {
  try { return sessionStorage.getItem(OFFER_KEY) === '1'; } catch { return false; }
}
