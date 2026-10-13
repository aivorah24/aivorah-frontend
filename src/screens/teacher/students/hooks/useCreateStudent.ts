import { useState } from 'react';
import { Platform, Share, Alert } from 'react-native';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import firebaseApp from '../../../../config/firebase';
import { initStudentAuth, linkCreatedStudent, inviteStudent } from '../services/studentsService';
import { isRealStudentEmail } from '../utils/studentDisplay';

function frontendOrigin() {
  return Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
}

export function useCreateStudent(user: any, onCreated: () => void) {
  // Create new student fields
  const [newName,       setNewName]       = useState('');
  const [newEmail,      setNewEmail]      = useState('');
  const [newPassword,   setNewPassword]   = useState('');
  const [newGrade,      setNewGrade]      = useState('Grade 3');
  const [newCurriculum, setNewCurriculum] = useState('IB PYP');
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState('');
  // Credentials popup after creating
  const [credsModal,    setCredsModal]    = useState(false);
  const [credsEmail,    setCredsEmail]    = useState('');
  const [credsPassword, setCredsPassword] = useState('');
  const [credsName,     setCredsName]     = useState('');
  const [credsCopiedField, setCredsCopiedField] = useState('');
  // Real-email students get an invite instead of credentials.
  const [credsInvited,  setCredsInvited]  = useState(false);
  const [inviteWarning, setInviteWarning] = useState('');

  function copyCredsField(text: string, field: string) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCredsCopiedField(field);
    setTimeout(() => setCredsCopiedField(''), 1500);
  }

  async function shareCredsToStudent(name: string, email: string, password: string) {
    const message = `${name}'s Aivorah login:\nEmail: ${email}\nPassword: ${password}`;
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        try { await nav.share({ text: message }); return; } catch { /* cancelled or unsupported */ }
      }
      copyCredsField(message, 'share');
      Alert.alert('Copied', 'Sharing is not available in this browser — the login details were copied instead, so you can paste them anywhere.');
      return;
    }
    try { await Share.share({ message }); } catch { /* cancelled */ }
  }

  // closeAddModal is invoked right before the credentials popup opens, matching
  // the monolithic screen's ordering.
  async function handleCreateStudent(closeAddModal: () => void) {
    if (!newName.trim()) { setCreateError('Name is required.'); return; }
    setCreating(true); setCreateError('');
    try {
      if (isRealStudentEmail(newEmail)) {
        const res = await inviteStudent(user?.email || '', {
          name: newName.trim(), email: newEmail.trim().toLowerCase(),
          grade: newGrade, curriculum: newCurriculum, frontendOrigin: frontendOrigin(),
        });
        const data = await res.json();
        if (!res.ok) { setCreateError(data.error || 'Failed to create student.'); return; }
        setCredsEmail(data.student?.email || newEmail.trim().toLowerCase());
        setCredsPassword('');
        setCredsName(data.student?.name || newName.trim());
        setCredsInvited(true);
        setInviteWarning(data.inviteError || (data.verificationSent === false ? 'The verification email could not be sent — the student can request it again when signing in.' : ''));
        closeAddModal();
        setCredsModal(true);
        onCreated();
        return;
      }

      // 1. Get credentials from server
      const initRes = await initStudentAuth({
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        password: newPassword.trim() || undefined,
        teacherEmail: user?.email || '',
      });
      const init = await initRes.json();
      if (!initRes.ok) { setCreateError(init.error || 'Failed to generate credentials.'); return; }

      const finalEmail    = init.email as string;
      const finalPassword = init.password as string;

      // 2. Create Firebase account via secondary app instance
      const tempApp  = initializeApp(firebaseApp.options, `teacher-create-${Date.now()}`);
      const tempAuth = getAuth(tempApp);
      const cred     = await createUserWithEmailAndPassword(tempAuth, finalEmail, finalPassword);
      await updateProfile(cred.user, { displayName: newName.trim() });
      await firebaseSignOut(tempAuth);
      await deleteApp(tempApp);

      // 3. Save to Supabase + link to this teacher
      const linkRes = await linkCreatedStudent(user?.email || '', {
        firebaseUid:     cred.user.uid,
        name:            newName.trim(),
        email:           finalEmail,
        grade:           newGrade,
        curriculum:      newCurriculum,
        initialPassword: finalPassword,
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) { setCreateError(linkData.error || 'Failed to save student.'); return; }

      // 4. Show credentials popup
      setCredsInvited(false); setInviteWarning('');
      setCredsEmail(finalEmail);
      setCredsPassword(finalPassword);
      setCredsName(newName.trim());
      closeAddModal();
      setCredsModal(true);
      onCreated();
    } catch (e: any) {
      setCreateError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  // Reset used when the Add Student modal (re)opens.
  function resetCreateForm(firstGrade: string, firstCurr: string) {
    setNewName(''); setNewEmail(''); setNewPassword('');
    setNewGrade(firstGrade);
    setNewCurriculum(firstCurr);
    setCreateError('');
  }

  return {
    newName, setNewName, newEmail, setNewEmail, newPassword, setNewPassword,
    newGrade, setNewGrade, newCurriculum, setNewCurriculum,
    creating, createError, setCreateError,
    credsModal, setCredsModal, credsEmail, credsPassword, credsName, credsInvited, inviteWarning,
    credsCopiedField, copyCredsField, shareCredsToStudent,
    handleCreateStudent, resetCreateForm,
  };
}
