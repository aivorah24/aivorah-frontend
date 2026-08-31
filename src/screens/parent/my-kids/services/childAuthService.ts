import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import firebaseApp from '../../../../config/firebase';

// Creates the child's Firebase Auth user in a *secondary* app instance so the
// signed-in parent's session is never replaced. The secondary app is always
// signed out and torn down, even when creation throws.
export async function createChildFirebaseUser(
  childEmail: string,
  childPassword: string,
  childName: string,
): Promise<string> {
  const secondaryName = `mykids-child-${Date.now()}`;
  const childApp = initializeApp((firebaseApp as any).options, secondaryName);
  const childAuth = getAuth(childApp);
  try {
    const childCred = await createUserWithEmailAndPassword(childAuth, childEmail, childPassword);
    await updateProfile(childCred.user, { displayName: `${childName}|student` }).catch(() => {});
    return childCred.user.uid;
  } finally {
    await signOut(childAuth).catch(() => {});
    await deleteApp(childApp).catch(() => {});
  }
}
