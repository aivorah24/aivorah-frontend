// The one place raw account-creation codes (Firebase Identity Toolkit, or a
// backend that passed one through) become admin-facing text. Anything that
// already reads like a sentence is shown as-is.
const FRIENDLY: Record<string, string> = {
  EMAIL_EXISTS: 'This email is already registered.',
  INVALID_EMAIL: 'That email address doesn’t look right. Check it and try again.',
  WEAK_PASSWORD: 'Couldn’t set a password for this account. Please try again.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please wait a minute and try again.',
  OPERATION_NOT_ALLOWED: 'Account creation is turned off right now. Contact support.',
  'FIREBASE_API_KEY not set': 'Account creation isn’t configured on the server. Contact support.',
};

const RAW_CODE = /^[A-Z][A-Z0-9_]+(\s*:.*)?$/;

export function friendlyAccountError(raw: string | undefined | null, fallback: string): string {
  const msg = String(raw || '').trim();
  if (!msg) return fallback;
  const code = msg.split(':')[0].trim();
  if (FRIENDLY[msg]) return FRIENDLY[msg];
  if (FRIENDLY[code]) return FRIENDLY[code];
  // An unmapped SHOUTY_CODE is never shown raw.
  return RAW_CODE.test(msg) ? fallback : msg;
}
