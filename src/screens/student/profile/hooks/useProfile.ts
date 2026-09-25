import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../context/AuthContext';
import { AVATAR_STYLES } from '../../../../constants/avatarStyles';
import { saveProfileFields, savePreferences, uploadProfilePhoto } from '../services/profileService';

const AVATARS = AVATAR_STYLES;

export function useProfile() {
  const { user, updateUser, logout } = useAuth();
  const [signOutVisible, setSignOutVisible] = useState(false);

  // Derived from user (not local state) so the hero stays in sync when the server profile lands after the cached one.
  const photoUrl: string | null = (user as any)?.photoUrl ?? null;
  const selAvatar: string = (user as any)?.avatarStyle ?? 'default';
  const [uploading, setUploading] = useState(false);
  const [learningStyle, setLearningStyle] = useState<string>((user as any)?.learningStyle ?? '');
  const [interests, setInterests] = useState<string[]>((user as any)?.interests ?? []);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editGrade, setEditGrade] = useState(user?.grade || '');
  const [editCurriculum, setEditCurriculum] = useState(user?.curriculum || '');
  const [editLocation, setEditLocation] = useState(user?.location || '');
  const [editSchool, setEditSchool] = useState((user as any)?.school || '');
  const [editBio, setEditBio] = useState((user as any)?.bio || '');
  const [locating, setLocating] = useState(false);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState('');

  const currentAvatar = AVATARS.find(a => a.id === selAvatar) || AVATARS[0];

  function toggleInterest(id: string) {
    const next = interests.includes(id) ? interests.filter(i => i !== id) : [...interests, id];
    setInterests(next);
    updateUser({ interests: next } as any);
  }

  function handleSelectAvatar(id: string) {
    // Bug #9 (second finding): must send an EXPLICIT null, not undefined —
    // JSON.stringify drops undefined keys entirely, so the PATCH never told
    // the backend to clear the previously-uploaded photo. The header/sidebar
    // avatar prioritize photoUrl over avatarStyle, so a real (never cleared)
    // users.photo_url kept winning over the newly-picked avatar on refresh.
    updateUser({ avatarStyle: id, photoUrl: null } as any);
  }

  function handleSelectLearningStyle(id: string) {
    setLearningStyle(id);
    updateUser({ learningStyle: id } as any);
    savePreferences({ email: user?.email, learningStyle: id }).catch(() => {});
  }

  async function handleSaveProfile() {
    setSaveProfileError('');
    if (!editName.trim()) { setSaveProfileError('Please enter your name.'); return; }
    setSaveProfileLoading(true);
    try {
      // name / grade / location live in the `users` table — they MUST go to
      // /user/profile so teacher & parent views (which read users.name) update.
      const profileBody: Record<string, any> = { email: user?.email, name: editName.trim() };
      if (editGrade.trim()) profileBody.grade = editGrade.trim();
      if (editCurriculum.trim()) profileBody.curriculum = editCurriculum.trim();
      if (editLocation.trim()) profileBody.location = editLocation.trim();
      if (editSchool.trim()) profileBody.school = editSchool.trim();
      await saveProfileFields(profileBody as any);
      // bio is a soft preference, not a users column → keep it in preferences.
      if (editBio.trim()) {
        await savePreferences({ email: user?.email, bio: editBio.trim() });
      }
      updateUser({
        name: editName.trim(),
        grade: editGrade.trim() || user?.grade,
        curriculum: editCurriculum.trim() || user?.curriculum,
        location: editLocation.trim() || user?.location,
        school: editSchool.trim() || (user as any)?.school,
        bio: editBio.trim() || (user as any)?.bio,
      } as any);
      setEditVisible(false);
    } catch {
      setSaveProfileError('Could not save. Please try again.');
    } finally {
      setSaveProfileLoading(false);
    }
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const data = await uploadProfilePhoto(user?.email, result.assets[0].base64!, result.assets[0].mimeType ?? 'image/jpeg');
      const url = data.photoUrl || data.url;
      if (url) updateUser({ photoUrl: url } as any);
    } catch { Alert.alert('Upload failed', 'Could not upload photo. Please try again.'); }
    finally { setUploading(false); }
  }

  return {
    user, logout,
    signOutVisible, setSignOutVisible,
    photoUrl, uploading,
    selAvatar, currentAvatar, handleSelectAvatar,
    learningStyle, handleSelectLearningStyle,
    interests, toggleInterest,
    editVisible, setEditVisible,
    editName, setEditName,
    editGrade, setEditGrade,
    editCurriculum, setEditCurriculum,
    editLocation, setEditLocation,
    editSchool, setEditSchool,
    editBio, setEditBio,
    locating, setLocating,
    saveProfileLoading, saveProfileError,
    handleSaveProfile, handlePickPhoto,
    AVATARS,
  };
}
