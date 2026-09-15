import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { useAuth } from '../../../../context/AuthContext';
import firebaseApp from '../../../../config/firebase';
import { CURRICULA, getGradesForCurriculum } from '../../../onboarding/OnboardingScreen';
import {
  fetchChildren as fetchChildrenApi,
  fetchChildCredentials,
  resendChildCredentials,
  resetChildPasswordRequest,
  initChildAuth,
  linkCreatedChild,
  sendEmailOtp,
  verifyEmailOtp,
  updateChild,
  linkExistingChild,
  removeChildRequest,
  fetchParentTasks,
  createParentTask,
  deleteParentTask,
} from '../services/parentMyKidsService';

function generateStudentId(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4) || 'STU';
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `STU-${initials}-${suffix}`;
}

const DEMO_PARENT_EMAILS = new Set([
  'suresh@test.ai', 'deepa@test.ai', 'fatima@test.ai', 'prakash@test.ai', 'parent@demo.com',
]);

const DEMO_STATS: Record<string, object> = {
  'aanya@test.ai':  { xpPoints: 850,  currentStreak: 5, completedTopics: ['Number Sense', 'Addition', 'Shapes'],   studyTimeMinutes: 120, grade: 'Grade 3', school: 'Hyderabad International School' },
  'ishaan@test.ai': { xpPoints: 1050, currentStreak: 3, completedTopics: ['Fractions', 'Multiplication', 'Time'],  studyTimeMinutes: 180, grade: 'Grade 4', school: 'Hyderabad International School' },
  'rohan@test.ai':  { xpPoints: 1200, currentStreak: 2, completedTopics: ['Decimals', 'Area & Perimeter'],          studyTimeMinutes: 150, grade: 'Grade 5', school: 'Hyderabad International School' },
  'diya@test.ai':   { xpPoints: 780,  currentStreak: 7, completedTopics: ['Patterns', 'Counting', 'Measurement'],  studyTimeMinutes: 100, grade: 'Grade 3', school: 'Hyderabad International School' },
};

export function useMyKids() {
  const { user } = useAuth();

  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'link'>('create');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newCurriculum, setNewCurriculum] = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [childEmail, setChildEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [credsModal, setCredsModal] = useState(false);
  const [credsEmail, setCredsEmail] = useState('');
  const [credsPassword, setCredsPassword] = useState('');
  const [credsStudentId, setCredsStudentId] = useState('');
  const [credsName, setCredsName] = useState('');

  const [removeConfirmChild, setRemoveConfirmChild] = useState<any>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const [viewCredsChild, setViewCredsChild] = useState<any>(null);
  const [viewCreds, setViewCreds] = useState<any>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [resendingCreds, setResendingCreds] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  const [editChild, setEditChild] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGrade, setEditGrade] = useState('Grade 3');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentEmail, setOtpSentEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'create' | 'edit'>('edit');
  const [editCurriculum, setEditCurriculum] = useState('IB PYP');
  const [editSchool, setEditSchool] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [taskModalChild, setTaskModalChild] = useState<any>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [childTasks, setChildTasks] = useState<any[]>([]);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskCoins, setTaskCoins] = useState('5');
  const [taskIcon, setTaskIcon] = useState('check-circle');
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState('');

  const parentEmail = user?.email || 'parent@demo.com';
  const isDemo = DEMO_PARENT_EMAILS.has(parentEmail.toLowerCase());

  function copyToClipboard(text: string, field: string) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  }

  async function shareCredentials(childName: string, loginId: string) {
    const message = `${childName}'s Aivorah login ID: ${loginId}\n(Password was sent to your email separately.)`;
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        try { await nav.share({ text: message }); return; } catch { /* user cancelled or unsupported — fall through */ }
      }
      copyToClipboard(message, 'share');
      Alert.alert('Copied', 'Sharing is not available in this browser — the login details were copied instead, so you can paste them anywhere.');
      return;
    }
    try { await Share.share({ message }); } catch { /* user cancelled */ }
  }

  async function fetchChildCreds(child: any) {
    setViewCredsChild(child);
    setViewCreds(null);
    setLoadingCreds(true);
    setResendSuccess(false);
    try {
      const res = await fetchChildCredentials(parentEmail, child.id);
      if (res.ok) {
        setViewCreds(await res.json());
      } else {
        setViewCreds({ loginId: child.email, studentId: null, initialPassword: null });
      }
    } catch {
      setViewCreds({ loginId: child.email, studentId: null, initialPassword: null });
    } finally {
      setLoadingCreds(false);
    }
  }

  async function resendCredsEmail(child: any) {
    setResendingCreds(true);
    setResendSuccess(false);
    try {
      const res = await resendChildCredentials(parentEmail, child.id);
      if (res.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 4000);
      }
    } catch { /* ignore */ }
    finally { setResendingCreds(false); }
  }

  async function resetChildPassword(child: any) {
    setResettingPassword(true);
    setResetPasswordSuccess(false);
    try {
      const frontendOrigin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://aivorah.ai';
      const res = await resetChildPasswordRequest(parentEmail, child.id, frontendOrigin);
      if (res.ok) {
        setResetPasswordSuccess(true);
        setTimeout(() => setResetPasswordSuccess(false), 5000);
      } else {
        Alert.alert('Error', 'Could not send reset email. Please try again.');
      }
    } catch { Alert.alert('Error', 'Network error. Please try again.'); }
    finally { setResettingPassword(false); }
  }

  function openModal(tab: 'create' | 'link' = 'create') {
    setModalTab(tab);
    setNewName(''); setNewEmail(''); setNewGrade('');
    setNewCurriculum(''); setNewSchool(''); setCreateError('');
    setChildEmail(''); setLinkError('');
    setShowModal(true);
  }

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetchChildrenApi(parentEmail);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setChildren(data);
        } else if (isDemo) {
          const derived = (user?.children ?? []).map((c: any, i: number) => ({
            id: c.email || `child-${i}`, name: c.name, email: c.email, grade: c.grade,
            ...(DEMO_STATS[c.email] ?? {}),
          }));
          setChildren(derived);
        } else {
          setChildren([]);
        }
      } else if (isDemo) {
        const derived = (user?.children ?? []).map((c: any, i: number) => ({
          id: c.email || `child-${i}`, name: c.name, email: c.email, grade: c.grade,
          ...(DEMO_STATS[c.email] ?? {}),
        }));
        setChildren(derived);
      } else {
        setChildren([]);
      }
    } catch {
      if (isDemo) {
        const derived = (user?.children ?? []).map((c: any, i: number) => ({
          id: c.email || `child-${i}`, name: c.name, email: c.email, grade: c.grade,
          ...(DEMO_STATS[c.email] ?? {}),
        }));
        setChildren(derived);
      } else {
        setChildren([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentEmail, isDemo, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the initial + polling fetch, not derivable from render-time values
    fetchChildren();
    const interval = setInterval(fetchChildren, 15 * 1000);
    return () => clearInterval(interval);
  }, [fetchChildren]);

  useFocusEffect(useCallback(() => { fetchChildren(); }, [fetchChildren]));

  async function createStudent(otpVerified: boolean = false) {
    if (!newName.trim()) { setCreateError('Child\'s name is required.'); return; }
    if (!newCurriculum) { setCreateError('Please select a curriculum.'); return; }
    if (!newGrade) { setCreateError('Please select a grade.'); return; }
    if (newEmail.trim() && !/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
      setCreateError('Please enter a valid child email address.'); return;
    }
    setCreating(true); setCreateError('');
    const childName = newName.trim();
    const studentId = generateStudentId(childName);
    try {
      const initRes = await initChildAuth({
        name: childName,
        email: newEmail.trim().toLowerCase() || undefined,
        studentId,
        parentEmail,
      });
      const init = await initRes.json().catch(() => ({}));
      if (!initRes.ok) { setCreateError(init.error || 'Could not prepare child account.'); return; }
      const childEmailResolved = String(init.email || '').toLowerCase();
      const childPassword = String(init.password || '');
      const finalStudentId = init.studentId || studentId;

      const secondaryName = `mykids-child-${Date.now()}`;
      const childApp = initializeApp((firebaseApp as any).options, secondaryName);
      const childAuth = getAuth(childApp);
      let firebaseUid = '';
      try {
        const childCred = await createUserWithEmailAndPassword(childAuth, childEmailResolved, childPassword);
        firebaseUid = childCred.user.uid;
        await updateProfile(childCred.user, { displayName: `${childName}|student` }).catch(() => {});
      } finally {
        await signOut(childAuth).catch(() => {});
        await deleteApp(childApp).catch(() => {});
      }

      const res = await linkCreatedChild(parentEmail, {
        firebaseUid,
        studentId: finalStudentId,
        name: childName,
        email: childEmailResolved,
        grade: newGrade,
        curriculum: newCurriculum,
        school: newSchool.trim(),
        verificationRequired: false,
        initialPassword: childPassword,
        otpVerified,
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(res.status === 409
          ? (data.error || 'A child with this name and grade is already linked to your account.')
          : (data.error || 'Could not create account.'));
        return;
      }
      setShowModal(false);
      fetchChildren();
      if (data.child) {
        setCredsName(data.child.name);
        setCredsEmail(data.child.email);
        setCredsPassword(childPassword);
        setCredsStudentId(data.child.studentId || finalStudentId);
        setCredsModal(true);
      }
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setCreateError('This email is already in use. Try another email or leave it blank for auto-generated login.');
      } else {
        setCreateError(err?.message || 'Network error. Please try again.');
      }
    }
    finally { setCreating(false); }
  }

  function openEdit(child: any) {
    setEditChild(child);
    setEditName(child.name || '');
    setEditEmail(child.email || '');
    setEditGrade(child.grade || 'Grade 3');
    setEditCurriculum(child.curriculum || 'IB PYP');
    setEditSchool(child.school || '');
    setEditError('');
  }

  async function handleEditSubmit() {
    if (!editChild || !editName.trim()) { setEditError('Name is required.'); return; }
    if (editEmail.trim() && !/^\S+@\S+\.\S+$/.test(editEmail.trim())) { setEditError('Please enter a valid email address.'); return; }

    const emailChanged = editEmail.trim().toLowerCase() !== editChild.email?.toLowerCase();
    const isRealEmail = editEmail.trim() && !editEmail.trim().endsWith('@aivorah.student');

    if (emailChanged && isRealEmail) {
      setSaving(true); setEditError('');
      try {
        const res = await sendEmailOtp(editEmail.trim().toLowerCase(), editName.trim());
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setEditError(data.error || 'Failed to send OTP code.'); return; }

        setOtpSentEmail(editEmail.trim().toLowerCase());
        setOtpPurpose('edit');
        setOtpCode('');
        setShowOtpInput(true);
      } catch {
        setEditError('Network error sending OTP. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      saveEdit();
    }
  }

  async function handleCreateSubmit() {
    if (!newName.trim() || !newCurriculum || !newGrade) { setCreateError('Name, Grade and Curriculum are required.'); return; }
    if (newEmail.trim() && !/^\S+@\S+\.\S+$/.test(newEmail.trim())) { setCreateError('Please enter a valid email address.'); return; }

    const isRealEmail = newEmail.trim() && !newEmail.trim().endsWith('@aivorah.student');

    if (isRealEmail) {
      setCreating(true); setCreateError('');
      try {
        const res = await sendEmailOtp(newEmail.trim().toLowerCase(), newName.trim());
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setCreateError(data.error || 'Failed to send OTP code.'); return; }

        setOtpSentEmail(newEmail.trim().toLowerCase());
        setOtpPurpose('create');
        setOtpCode('');
        setShowOtpInput(true);
      } catch {
        setCreateError('Network error sending OTP. Please try again.');
      } finally {
        setCreating(false);
      }
    } else {
      createStudent();
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      const setErr = otpPurpose === 'edit' ? setEditError : setCreateError;
      setErr('Please enter a 6-digit code.');
      return;
    }
    setIsVerifyingOtp(true);
    if (otpPurpose === 'edit') setEditError(''); else setCreateError('');
    try {
      const res = await verifyEmailOtp(otpSentEmail, otpCode.trim());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const setErr = otpPurpose === 'edit' ? setEditError : setCreateError;
        setErr(data.error || 'Invalid OTP code. Please try again.');
        return;
      }

      if (otpPurpose === 'edit') {
        await saveEdit(true);
      } else {
        await createStudent(true);
      }
      setShowOtpInput(false);
      setOtpCode('');
    } catch {
      const setErr = otpPurpose === 'edit' ? setEditError : setCreateError;
      setErr('Verification network error. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function saveEdit(otpVerified: boolean = false) {
    if (!editChild || !editName.trim()) { setEditError('Name is required.'); return; }
    if (editEmail.trim() && !/^\S+@\S+\.\S+$/.test(editEmail.trim())) { setEditError('Please enter a valid email address.'); return; }
    setSaving(true); setEditError('');
    try {
      const res = await updateChild(parentEmail, editChild.id, {
        name: editName.trim(), email: editEmail.trim().toLowerCase(), grade: editGrade, curriculum: editCurriculum, school: editSchool.trim(), otpVerified,
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error || 'Could not update.'); return; }
      setChildren(prev => prev.map(c => c.id === editChild.id ? { ...c, ...data.child } : c));
      setEditChild(null);
      fetchChildren();
    } catch { setEditError('Network error. Please try again.'); }
    finally { setSaving(false); }
  }

  async function addChild() {
    if (!childEmail.trim()) return;
    setLinking(true); setLinkError('');
    try {
      const res = await linkExistingChild(parentEmail, childEmail.trim());
      const data = await res.json();
      if (!res.ok) { setLinkError(data.error || 'Could not link child.'); return; }
      setChildEmail(''); setShowModal(false); setLoading(true); fetchChildren();
    } catch { setLinkError('Network error. Please try again.'); }
    finally { setLinking(false); }
  }

  function confirmRemove(child: any) {
    setRemoveError('');
    setRemoveConfirmChild(child);
  }

  async function removeChild() {
    if (!removeConfirmChild) return;
    setRemoving(true);
    setRemoveError('');
    try {
      const res = await removeChildRequest(parentEmail, removeConfirmChild.id);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRemoveError(err?.error || 'Could not remove child. Please try again.');
        return;
      }
      setChildren(prev => prev.filter(c => c.id !== removeConfirmChild.id));
      setRemoveConfirmChild(null);
    } catch {
      setRemoveError('Network error. Please try again.');
    } finally {
      setRemoving(false);
    }
  }

  async function openTaskModal(child: any) {
    setTaskModalChild(child);
    setTaskLabel(''); setTaskCoins('5'); setTaskIcon('check-circle'); setTaskError('');
    setShowTaskModal(true);
    try {
      const res = await fetchParentTasks(child.id);
      if (res.ok) setChildTasks(await res.json());
    } catch { setChildTasks([]); }
  }

  async function createTask() {
    if (!taskLabel.trim()) { setTaskError('Task label is required.'); return; }
    setSavingTask(true); setTaskError('');
    try {
      const res = await createParentTask({
        parentEmail,
        childId: taskModalChild?.id,
        childName: taskModalChild?.name,
        grade: taskModalChild?.grade,
        curriculum: taskModalChild?.curriculum,
        label: taskLabel.trim(),
        icon: taskIcon,
        coins: parseInt(taskCoins) || 5,
      });
      if (!res.ok) { const d = await res.json(); setTaskError(d.error || 'Could not save task.'); return; }
      const newTask = await res.json();
      setChildTasks(prev => [newTask, ...prev]);
      setTaskLabel(''); setTaskCoins('5');
    } catch { setTaskError('Network error.'); }
    finally { setSavingTask(false); }
  }

  async function deleteTask(taskId: string) {
    try {
      await deleteParentTask(taskId);
      setChildTasks(prev => prev.filter(t => t.id !== taskId));
    } catch { /* ignore */ }
  }

  return {
    CURRICULA, getGradesForCurriculum,
    children, loading, refreshing, setRefreshing, fetchChildren,
    showModal, setShowModal, modalTab, setModalTab, openModal,
    newName, setNewName, newEmail, setNewEmail, newGrade, setNewGrade,
    newCurriculum, setNewCurriculum, newSchool, setNewSchool, creating, createError, setCreateError,
    childEmail, setChildEmail, linking, linkError, setLinkError,
    credsModal, setCredsModal, credsEmail, credsPassword, credsStudentId, credsName,
    removeConfirmChild, setRemoveConfirmChild, removing, removeError, setRemoveError, confirmRemove, removeChild,
    viewCredsChild, setViewCredsChild, viewCreds, setViewCreds, loadingCreds, copiedField,
    resendingCreds, resendSuccess, resettingPassword, resetPasswordSuccess, setResetPasswordSuccess,
    editChild, setEditChild, editName, setEditName, editEmail, setEditEmail, editGrade, setEditGrade,
    showOtpInput, setShowOtpInput, otpCode, setOtpCode, isVerifyingOtp, otpSentEmail, otpPurpose,
    editCurriculum, setEditCurriculum, editSchool, setEditSchool, saving, editError, setEditError,
    taskModalChild, showTaskModal, setShowTaskModal, childTasks, taskLabel, setTaskLabel,
    taskCoins, setTaskCoins, taskIcon, setTaskIcon, savingTask, taskError, setTaskError,
    copyToClipboard, shareCredentials, fetchChildCreds, resendCredsEmail, resetChildPassword,
    createStudent, openEdit, handleEditSubmit, handleCreateSubmit, handleVerifyOtp, saveEdit,
    addChild, openTaskModal, createTask, deleteTask,
  };
}
