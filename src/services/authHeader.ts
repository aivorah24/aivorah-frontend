import { auth } from '../config/firebase';

// Bearer header with the signed-in user's Firebase ID token.
export async function authHeader(): Promise<Record<string, string>> {
  // After a page refresh Firebase restores the sign-in a moment later.
  await auth.authStateReady?.();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${idToken}` };
}
