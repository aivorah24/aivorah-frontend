import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from 'firebase/auth';
import app from '../../../../config/firebase';

// The Google account picker signs in on a separate, in-memory Firebase app so
// the user's real session never switches to the picked account.
const PICKER_APP = 'google-account-picker';

function pickerAuth() {
  const picker = getApps().find((a) => a.name === PICKER_APP) || initializeApp(app.options, PICKER_APP);
  return getAuth(picker);
}

export async function pickGoogleAccount(): Promise<{ email: string; idToken: string }> {
  const auth = pickerAuth();
  await setPersistence(auth, inMemoryPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  try {
    return { email: (result.user.email || '').toLowerCase(), idToken: await result.user.getIdToken() };
  } finally {
    await signOut(auth).catch(() => {});
  }
}
