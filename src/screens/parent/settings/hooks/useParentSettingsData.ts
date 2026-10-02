import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  updatePassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
} from 'firebase/auth';
import { auth } from '../../../../config/firebase';
import { useAuth } from '../../../../context/AuthContext';
import type { ModalType } from '../types';
import * as settingsService from '../services/settingsService';

export function useParentSettingsData() {
  const { user, updateUser, logout } = useAuth();

  const [photoUrl, setPhotoUrl] = useState<string | null>((user as any)?.photoUrl ?? null);
  const [uploading, setUploading] = useState(false);

  const isGoogleUser = user?.authProvider === 'google'
    || (auth.currentUser?.providerData ?? []).some((p) => p.providerId === 'google.com');
  const isPasswordUser = !isGoogleUser;

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [newName, setNewName] = useState(user?.name || '');
  const [newLocation, setNewLocation] = useState(user?.location || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function openModal(type: ModalType) {
    setNewName(user?.name || '');
    setNewLocation(user?.location || '');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setModalError('');
    setActiveModal(type);
  }
  function closeModal() { setActiveModal(null); setModalLoading(false); }

  async function handlePickPhoto() {
    if (!user?.email) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await settingsService.uploadPhoto(user.email, result.assets[0].base64!, result.assets[0].mimeType ?? 'image/jpeg');
      setPhotoUrl(url);
      updateUser({ photoUrl: url } as any);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveName() {
    const trimmed = newName.trim();
    if (!trimmed) { Alert.alert('Required', 'Please enter a name.'); return; }
    updateUser({ name: trimmed });
    closeModal();
    try {
      await settingsService.syncProfile({ email: user?.email, name: trimmed });
    } catch {}
    Alert.alert('Updated', 'Your display name has been updated.');
  }

  // /user/sync only upserts when `name` is present, so location saves must
  // resend the current name too.
  async function handleSaveLocation() {
    const trimmed = newLocation.trim();
    if (!trimmed) { setModalError('Please enter a location.'); return; }
    setModalLoading(true);
    try {
      await settingsService.syncProfile({ email: user?.email, name: user?.name, location: trimmed });
      updateUser({ location: trimmed } as any);
      closeModal();
      Alert.alert('Updated', 'Your location has been saved.');
    } catch (e: any) {
      setModalError(e.message || 'Failed to update location.');
    } finally {
      setModalLoading(false);
    }
  }

  async function handleChangePassword() {
    const curPwClean = (currentPw || '').replace(/\s+/g, '');
    const newPwClean = (newPw || '').replace(/\s+/g, '');
    const confirmPwClean = (confirmPw || '').replace(/\s+/g, '');
    if (!curPwClean) { Alert.alert('Required', 'Enter your current password.'); return; }
    if (newPwClean.length < 6) { Alert.alert('Too Short', 'New password must be at least 6 characters.'); return; }
    if (newPwClean !== confirmPwClean) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setModalLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser?.email) {
        const cred = EmailAuthProvider.credential(firebaseUser.email, curPwClean);
        await reauthenticateWithCredential(firebaseUser, cred);
        await updatePassword(firebaseUser, newPwClean);
      }
      closeModal();
      Alert.alert('Password Changed', 'Your password has been updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setModalLoading(false);
    }
  }

  function openDeleteModal() {
    setDeletePassword(''); setDeleteError(''); setDeleteModalVisible(true);
  }

  async function confirmDeleteAccount() {
    setDeleteError('');
    if (isPasswordUser && !deletePassword) { setDeleteError('Please enter your password to confirm.'); return; }
    setDeleteLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser?.email) {
        if (isPasswordUser) {
          const cred = EmailAuthProvider.credential(firebaseUser.email, deletePassword);
          await reauthenticateWithCredential(firebaseUser, cred);
        } else {
          await reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider());
        }
        await settingsService.deleteAccount(firebaseUser.email);
        try { await deleteUser(firebaseUser); } catch { /* already deleted server-side */ }
      }
      logout();
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setDeleteError('Google confirmation was cancelled. Please try again.');
      } else {
        setDeleteError('Could not delete account. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || window.confirm('Are you sure you want to sign out?')) logout();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return {
    user, photoUrl, uploading, isGoogleUser, isPasswordUser,
    activeModal, modalLoading, modalError, openModal, closeModal,
    newName, setNewName, newLocation, setNewLocation,
    currentPw, setCurrentPw, newPw, setNewPw, confirmPw, setConfirmPw,
    deleteModalVisible, setDeleteModalVisible, deletePassword, setDeletePassword, deleteLoading, deleteError, setDeleteError,
    handlePickPhoto, handleSaveName, handleSaveLocation, handleChangePassword,
    openDeleteModal, confirmDeleteAccount, handleSignOut,
  };
}
