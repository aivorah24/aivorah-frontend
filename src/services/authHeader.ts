// Bearer header with the signed-in user's Firebase ID token.
// Firebase is loaded lazily (same as notificationsApi) so importers don't pull it in at module load.
export async function authHeader(): Promise<Record<string, string>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose (see above)
  const { auth } = require('../config/firebase');
  // After a page refresh Firebase restores the sign-in a moment later.
  await auth.authStateReady?.();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${idToken}` };
}
