import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Platform, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import ConnectSchoolBanner from '../../../features/classes/components/ConnectSchoolBanner';
import { useAuth } from '../../../context/AuthContext';
import { getAvatarGradient, getAvatarIcon } from '../../../constants/avatarStyles';
import { useTheme } from '../../../context/ThemeContext';
import { useNotification } from '../../../context/NotificationContext';
import { auth } from '../../../config/firebase';
import { GRADES_TEACHER, CURRICULA, getGradesForCurriculum } from '../../onboarding/OnboardingScreen';
import TeachingEntriesEditor, { type TeachingEntry, emptyEntry } from '@legacy/school-admin/TeachingEntriesEditor';
import { useNotificationPreferences } from './hooks/useNotificationPreferences';
import { useTeacherPreferences } from './hooks/useTeacherPreferences';
import { useProfilePhoto } from './hooks/useProfilePhoto';
import { useBrandingLogos } from './hooks/useBrandingLogos';
import { useProfileFields } from './hooks/useProfileFields';
import { useEmailChange } from '../../shared/account/hooks/useEmailChange';
import ChangeEmailModal from '../../shared/account/components/ChangeEmailModal';
import { usePasswordChange } from './hooks/usePasswordChange';
import { useDeleteAccount } from './hooks/useDeleteAccount';
import SectionHeader from './components/SectionHeader';
import NotificationsSection from './components/NotificationsSection';
import BrandingLogosCard from './components/BrandingLogosCard';
import TeacherPreferencesCard from './components/TeacherPreferencesCard';

// Grade levels — mirrors the student onboarding grade selector so the teacher's
// "Grades you teach" picker groups grades by level instead of a flat list.
const GRADE_GROUPS = [
  { label: 'Early Years',   grades: ['Nursery', 'LKG', 'UKG'] },
  { label: 'Primary',       grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { label: 'Middle School', grades: ['Grade 6', 'Grade 7', 'Grade 8'] },
  { label: 'Senior School', grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
];

type ModalType = 'name' | 'email' | 'password' | 'school' | 'curriculum' | 'ssoInfo' | null;

export default function TeacherSettingsScreen({ navigation }: any) {
  const { user, updateUser, logout, switchRole } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { triggerPoll, clearUnreadAssignments, clearUnreadChallenges } = useNotification();
  const gold = colors.accentYellow;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Notifications — persisted to AsyncStorage under the SAME key/keys the
  // notification bell reads. See src/screens/teacher/settings/hooks/
  // useNotificationPreferences.ts — extracted 2026-08-27, behavior unchanged
  // (unit-tested there, E2E-covered by teacher/settings/settings.spec.js).
  // Only Parent Messages is a live toggle (see NotificationsSection.tsx) —
  // submissionAlerts/weeklyReport/aiInsights/challengeAlerts still load/save
  // via saveNotifPrefs's closure inside the hook, just not read here.
  const { parentMessages, setParentMessages, saveNotifPrefs } = useNotificationPreferences(user?.email, triggerPoll);

  // Teaching prefs enforced server-side (AI Auto-Grading, Share Progress).
  // See useTeacherPreferences.ts — extracted 2026-08-27, same call/behavior.
  const {
    autoGrading, setAutoGrading,
    shareProgress, setShareProgress,
    teacherRoleVal, experienceVal,
    saveTeacherPref,
  } = useTeacherPreferences(user?.email);

  // Profile photo — same upload flow as the student profile (shared for all
  // roles). See useProfilePhoto.ts — extracted 2026-08-27, same behavior.
  const { photoUrl, uploading, handlePickPhoto } = useProfilePhoto(
    user?.email, (user as any)?.photoUrl ?? null, updateUser,
  );

  // School + curriculum logo — uploaded once here, reused on every worksheet
  // for this school/curriculum. See useBrandingLogos.ts — extracted
  // 2026-08-27, same behavior.
  const { schoolLogoUrl, curriculumLogoUrl, uploadingLogo, handlePickLogo } = useBrandingLogos(
    user?.school, (user as any)?.curriculum,
  );

  // Edit modals
  const [activeModal,   setActiveModal]   = useState<ModalType>(null);
  const [newName,       setNewName]       = useState(user?.name || '');
  const [currentPw,     setCurrentPw]    = useState('');
  const [newPw,         setNewPw]        = useState('');
  const [confirmPw,     setConfirmPw]    = useState('');
  const [showCurrent,   setShowCurrent]  = useState(false);
  const [showNew,       setShowNew]      = useState(false);
  const [newSchool,     setNewSchool]    = useState(user?.school || '');
  // Multi-curriculum: a teacher can teach several INDEPENDENT curriculum+grade
  // combos (e.g. IB MYP for Grade 7 AND CBSE for Grade 9) — each row is its
  // own entry, not a cartesian product of every curriculum × every grade.
  function teachesToEntries(): TeachingEntry[] {
    if (Array.isArray(user?.teaches) && user.teaches.length > 0) {
      return user.teaches.map((t: any) => ({
        curriculum: t.curriculum || '', grade: t.grade || '',
        subjectsInput: Array.isArray(t.subjects) ? t.subjects.join(', ') : '',
      }));
    }
    return user?.curriculum || user?.grade ? [{ curriculum: user?.curriculum || '', grade: user?.grade || '', subjectsInput: '' }] : [emptyEntry()];
  }
  const [editEntries, setEditEntries] = useState<TeachingEntry[]>(teachesToEntries());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Feedback + sign-out confirm (replaces Alert.alert on web)
  const [feedback,       setFeedback]       = useState<{ title: string; message: string } | null>(null);
  // Set when the feedback dialog being shown must sign the user out once
  // dismissed (currently: after a successful email change — see below for why).
  const [logoutAfterFeedback, setLogoutAfterFeedback] = useState(false);
  function dismissFeedback() {
    setFeedback(null);
    if (logoutAfterFeedback) { setLogoutAfterFeedback(false); logout(); }
  }
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Provider-aware account deletion: password users confirm with password, Google
  // SSO users confirm via Google popup. The server removes Supabase + Firebase Auth.
  const isGoogleUser   = user?.authProvider === 'google' || (auth.currentUser?.providerData ?? []).some(p => p.providerId === 'google.com');
  const isPasswordUser = !isGoogleUser;

  // Extracted 2026-08-27 — see hooks/useDeleteAccount.ts (unit-tested there).
  // Uses the hook's OWN loading/error state directly (not mirrored into
  // local state) — mirroring via `setDeleteError(hook.error)` right after an
  // awaited call would read a stale closure value, since the hook's setError
  // only takes effect on ITS next render, not synchronously within this call.
  const { loading: deleteLoading, error: deleteError, setError: setDeleteError, confirmDelete } = useDeleteAccount(isPasswordUser, isGoogleUser, logout);
  function confirmDeleteAccount() {
    confirmDelete(deletePassword);
  }

  // Extracted 2026-08-27 — see hooks/useProfileFields.ts, useEmailChange.ts,
  // usePasswordChange.ts (all unit-tested there). `modalError`/`modalLoading`
  // used to be one shared useState pair every modal handler wrote into —
  // since only one modal is visible at a time (gated by `activeModal`), they
  // now derive directly from whichever hook owns the currently-open modal,
  // reading each hook's OWN live state (same non-stale reasoning as the
  // delete-account hook above) instead of a separate mirrored copy.
  const profileFields = useProfileFields(user?.email, updateUser);
  const emailChange = useEmailChange({ email: user?.email, name: user?.name, isGoogleUser });
  const passwordChangeHook = usePasswordChange();

  const modalLoading =
    activeModal === 'name' || activeModal === 'school' || activeModal === 'curriculum' ? profileFields.saving :
    activeModal === 'email' ? emailChange.loading :
    activeModal === 'password' ? passwordChangeHook.saving :
    false;
  const modalError =
    activeModal === 'name' || activeModal === 'school' || activeModal === 'curriculum' ? profileFields.error :
    activeModal === 'email' ? emailChange.error :
    activeModal === 'password' ? passwordChangeHook.error :
    '';
  function setModalError(message: string) {
    profileFields.setError(message);
    passwordChangeHook.setError(message);
  }

  function openModal(type: ModalType) {
    setNewName(user?.name || '');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setNewSchool(user?.school || '');
    setEditEntries(teachesToEntries());
    setOpenDropdown(null);
    emailChange.reset();
    setModalError('');
    setActiveModal(type);
  }
  function closeModal() { setActiveModal(null); setModalError(''); }

  async function handleSaveName() {
    const ok = await profileFields.saveName(newName);
    if (!ok) return;
    closeModal();
    setFeedback({ title: 'Updated', message: 'Your display name has been updated.' });
  }

  async function handleSaveSchool() {
    const ok = await profileFields.saveSchool(newSchool);
    if (!ok) return;
    closeModal();
    setFeedback({ title: 'Updated', message: 'School / Institution has been saved.' });
  }

  async function handleSaveCurriculum() {
    const ok = await profileFields.saveCurriculum(editEntries);
    if (!ok) return;
    closeModal();
    setFeedback({ title: 'Updated', message: 'Curriculum and grades have been saved.' });
  }

  async function handleChangePassword() {
    const ok = await passwordChangeHook.changePassword(currentPw, newPw, confirmPw);
    if (!ok) return;
    closeModal();
    setFeedback({ title: 'Password Changed', message: 'Your password has been updated successfully.' });
  }

  function handleSignOut() {
    setSignOutConfirm(true);
  }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Settings"
          subtitle="Manage your preferences and account"
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ConnectSchoolBanner />
          <View style={styles.columns}>

            {/* ── Left column ── */}
            <View style={styles.col}>
              {/* ── Profile ── */}
              <SectionHeader icon="user" label="Profile & Account" color={gold} styles={styles} />
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <TouchableOpacity style={styles.avatarBig} onPress={handlePickPhoto} activeOpacity={0.85}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
                    ) : (user as any)?.avatarStyle ? (
                      <LinearGradient
                        colors={getAvatarGradient((user as any).avatarStyle)}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: '100%', height: '100%', borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Feather name={getAvatarIcon((user as any).avatarStyle) as any} size={28} color="white" />
                      </LinearGradient>
                    ) : (
                      <Text style={styles.avatarInitial}>{user?.name ? user.name[0].toUpperCase() : 'T'}</Text>
                    )}
                    <View style={styles.avatarCam}>
                      {uploading ? <ActivityIndicator size="small" color={colors.accentYellow} /> : <Feather name="camera" size={11} color={colors.accentYellow} />}
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{user?.name || 'Teacher'}</Text>
                    <Text style={styles.profileSub}>{user?.email || ''}</Text>
                    <View style={styles.profileMeta}>
                      <View style={styles.roleBadge}>
                        <Feather name="briefcase" size={10} color={gold} />
                        <Text style={styles.roleBadgeText}>Teacher</Text>
                      </View>
                      {user?.school ? (
                        <View style={[styles.roleBadge, { backgroundColor: colors.accentGreen + '15', borderColor: colors.accentGreen + '30' }]}>
                          <Feather name="home" size={10} color={colors.accentGreen} />
                          <Text style={[styles.roleBadgeText, { color: colors.accentGreen }]}>{user.school}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={styles.divider} />
                <FieldRow label="Display Name" sub={user?.name || '—'} btnLabel="Change" onPress={() => openModal('name')} styles={styles} testID="teacher-settings-name-change-button" />
                <View style={styles.divider} />
                <FieldRow label="Email Address" sub={user?.email || '—'} btnLabel="Change" onPress={() => openModal('email')} styles={styles} />
                <View style={styles.divider} />
                <FieldRow label="School / Institution" sub={user?.school || 'Not set'} btnLabel="Update" onPress={() => openModal('school')} styles={styles} />
              </View>

              {/* ── Branding (school + curriculum logo, reused on every worksheet) ── */}
              <BrandingLogosCard
                school={user?.school} curriculum={(user as any)?.curriculum}
                schoolLogoUrl={schoolLogoUrl} curriculumLogoUrl={curriculumLogoUrl}
                uploadingLogo={uploadingLogo} handlePickLogo={handlePickLogo}
                colors={colors} gold={gold} styles={styles}
              />

              {/* ── Security ── */}
              <SectionHeader icon="shield" label="Security" color={colors.accentGreen} styles={styles} />
              <View style={styles.card}>
              <FieldRow
                label="Password"
                sub={isPasswordUser ? "Change your account password" : "Managed via Google Sign-In"}
                btnLabel={isPasswordUser ? "Change" : "Google SSO"}
                badgeOnly={!isPasswordUser}
                onPress={isPasswordUser ? () => openModal('password') : () => openModal('ssoInfo' as any)}
                styles={styles}
              />
                <View style={styles.divider} />
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Two-Factor Auth</Text>
                    <Text style={styles.fieldSub}>Add an extra layer of security</Text>
                  </View>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                </View>
              </View>

              {/* ── Account Actions ── */}
              <SectionHeader icon="alert-triangle" label="Account Actions" color={gold} styles={styles} />
              <View style={styles.card}>
                <View style={[styles.actionsRow, { marginTop: 0 }]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleSignOut} activeOpacity={0.8}>
                    <Feather name="log-out" size={17} color={gold} />
                    <Text style={[styles.actionBtnText, { color: gold }]}>Sign Out</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setDeletePassword(''); setDeleteError(''); setDeleteModalVisible(true); }} activeOpacity={0.8}>
                    <Feather name="trash-2" size={17} color={colors.accentRed} />
                    <Text style={[styles.actionBtnText, { color: colors.accentRed }]}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Right column ── */}
            <View style={styles.col}>
              {/* ── Teaching Preferences ── */}
              <TeacherPreferencesCard
                user={user} autoGrading={autoGrading} setAutoGrading={setAutoGrading}
                shareProgress={shareProgress} setShareProgress={setShareProgress}
                saveTeacherPref={saveTeacherPref} teacherRoleVal={teacherRoleVal} experienceVal={experienceVal}
                onOpenCurriculumModal={() => openModal('curriculum')}
                colors={colors} gold={gold} styles={styles}
              />

              {/* ── Notifications ── */}
              <NotificationsSection
                parentMessages={parentMessages} setParentMessages={setParentMessages}
                saveNotifPrefs={saveNotifPrefs} clearUnreadChallenges={clearUnreadChallenges}
                colors={colors} gold={gold} styles={styles}
              />

              {/* ── Appearance ── */}
              <SectionHeader icon="moon" label="Appearance" color={colors.accentPurple} styles={styles} />
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Theme</Text>
                <View style={styles.themeRow}>
                  {([
                    { id: 'dark', icon: 'moon', label: 'Dark' },
                    { id: 'light', icon: 'sun', label: 'Light' },
                    { id: 'auto', icon: 'monitor', label: 'Auto' },
                  ] as const).map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.themeOption, themeMode === t.id && styles.themeOptionActive]}
                      onPress={() => setThemeMode(t.id)}
                      activeOpacity={0.7}
                    >
                      <Feather name={t.icon} size={16} color={themeMode === t.id ? gold : colors.textMuted} />
                      <Text style={[styles.themeLabel, themeMode === t.id && { color: gold }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

          </View>
          <Text style={styles.versionText}>Aivorah v1.0.0 · NuShift</Text>
        </ScrollView>
      </View>

      {/* Change Name Modal */}
      <AppModal visible={activeModal === 'name'} title="Change Display Name" onClose={closeModal} styles={styles} colors={colors} testID="teacher-settings-name-modal">
        <Text style={styles.modalFieldLabel}>New Name</Text>
        <View style={styles.modalInput}>
          <Feather name="user" size={15} color={colors.textDim} />
          <TextInput
            testID="teacher-settings-name-input"
            style={styles.modalTextInput} value={newName} onChangeText={setNewName}
            placeholder="Your name" placeholderTextColor={colors.textDim}
            autoCapitalize="words" autoFocus
          />
        </View>
        {modalError ? <Text testID="teacher-settings-name-error" style={{ color: colors.accentRed, fontSize: 13, marginTop: 8 }}>{modalError}</Text> : null}
        <ModalButtons onCancel={closeModal} onSave={handleSaveName} loading={modalLoading} styles={styles} saveTestID="teacher-settings-name-save-button" />
      </AppModal>

      {/* Change Email Modal — two steps: (1) confirm identity + enter new email,
          (2) verify the code we email to the NEW address before committing. */}
      <ChangeEmailModal
        visible={activeModal === 'email'}
        onClose={closeModal}
        onSignOut={() => { closeModal(); logout(); }}
        userEmail={user?.email}
        emailChange={emailChange}
        styles={styles}
        colors={colors}
      />

      {/* Google SSO Info Modal */}
      <AppModal visible={activeModal === 'ssoInfo' || (activeModal === 'password' && !isPasswordUser)} title="Google Sign-In Account" onClose={closeModal} styles={styles} colors={colors}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentYellow + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Feather name="shield" size={24} color={colors.accentYellow} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain, textAlign: 'center', marginBottom: 8 }}>
            Managed via Google Sign-In
          </Text>
          <Text style={{ fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            You signed into Aivorah securely using your Google Account. Your password and account security are protected by Google. To change your password or security settings, please visit your Google Account Security settings (myaccount.google.com).
          </Text>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { width: '100%', marginTop: 8 }]}
            onPress={closeModal}
            activeOpacity={0.8}
          >
            <Text style={styles.modalSaveText}>Understood</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Change Password Modal */}
      <AppModal visible={activeModal === 'password' && isPasswordUser} title="Change Password" onClose={closeModal} styles={styles} colors={colors}>
        <Text style={styles.modalFieldLabel}>Current Password</Text>
        <View style={styles.modalInput}>
          <Feather name="lock" size={15} color={colors.textDim} />
          <TextInput
            style={[styles.modalTextInput, { flex: 1 }]} value={currentPw} onChangeText={setCurrentPw}
            placeholder="••••••••" placeholderTextColor={colors.textDim} secureTextEntry={!showCurrent} autoFocus
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
            <Feather name={showCurrent ? 'eye-off' : 'eye'} size={15} color={colors.textDim} />
          </TouchableOpacity>
        </View>
        <Text style={styles.modalFieldLabel}>New Password</Text>
        <View style={styles.modalInput}>
          <Feather name="lock" size={15} color={colors.textDim} />
          <TextInput
            style={[styles.modalTextInput, { flex: 1 }]} value={newPw} onChangeText={setNewPw}
            placeholder="Min. 6 characters" placeholderTextColor={colors.textDim} secureTextEntry={!showNew}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Feather name={showNew ? 'eye-off' : 'eye'} size={15} color={colors.textDim} />
          </TouchableOpacity>
        </View>
        <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
        <View style={styles.modalInput}>
          <Feather name="check" size={15} color={colors.textDim} />
          <TextInput
            style={styles.modalTextInput} value={confirmPw} onChangeText={setConfirmPw}
            placeholder="Repeat new password" placeholderTextColor={colors.textDim} secureTextEntry
          />
        </View>
        {modalError ? <Text style={{ color: colors.accentRed, fontSize: 13, marginTop: 8 }}>{modalError}</Text> : null}
        <ModalButtons onCancel={closeModal} onSave={handleChangePassword} loading={modalLoading} saveLabel="Change Password" styles={styles} />
      </AppModal>

      {/* School Modal */}
      <AppModal visible={activeModal === 'school'} title="School / Institution" onClose={closeModal} styles={styles} colors={colors}>
        <Text style={styles.modalFieldLabel}>School Name</Text>
        <View style={styles.modalInput}>
          <Feather name="home" size={15} color={colors.textDim} />
          <TextInput
            style={styles.modalTextInput} value={newSchool} onChangeText={setNewSchool}
            placeholder="e.g. DPS Hyderabad" placeholderTextColor={colors.textDim}
            autoCapitalize="words" autoFocus
          />
        </View>
        {modalError ? <Text style={{ color: colors.accentRed, fontSize: 13, marginTop: 8 }}>{modalError}</Text> : null}
        <ModalButtons onCancel={closeModal} onSave={handleSaveSchool} loading={modalLoading} saveLabel="Save" styles={styles} />
      </AppModal>

      {/* Curriculum Modal — one row per curriculum+grade the teacher actually
          teaches (e.g. IB MYP/Grade 7 and CBSE/Grade 9 as two independent rows,
          not a grid of every curriculum × every grade). */}
      <AppModal visible={activeModal === 'curriculum'} title="Curriculum & Grade" onClose={closeModal} styles={styles} colors={colors}>
        <Text style={styles.modalFieldLabel}>What you teach — add a row for each curriculum + grade</Text>
        <TeachingEntriesEditor
          entries={editEntries}
          onChange={setEditEntries}
          schoolCurriculumBase={null}
          colors={colors}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />
        {modalError ? <Text style={{ color: colors.accentRed, fontSize: 13, marginTop: 8 }}>{modalError}</Text> : null}
        <ModalButtons onCancel={closeModal} onSave={handleSaveCurriculum} loading={modalLoading} saveLabel="Save" styles={styles} />
      </AppModal>

      {/* Sign Out Confirmation */}
      <Modal visible={signOutConfirm} transparent animationType="fade" onRequestClose={() => setSignOutConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign Out</Text>
              <TouchableOpacity onPress={() => setSignOutConfirm(false)}><Feather name="x" size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <Text style={styles.modalNote}>Are you sure you want to sign out?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSignOutConfirm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.accentRed }]} onPress={() => { setSignOutConfirm(false); logout(); }}>
                <Text style={styles.modalSaveText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account — provider-aware (password vs Google), plain overlay for instant close */}
      {deleteModalVisible ? (
        <View style={{ position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 9999 }}>
          <View style={[styles.modalBox, { maxWidth: 380 }]}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentRed + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Feather name="trash-2" size={24} color={colors.accentRed} />
              </View>
              <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Delete Account?</Text>
              <Text style={[styles.modalNote, { textAlign: 'center', marginBottom: 0 }]}>
                This is permanent and cannot be undone. All your data will be lost.
              </Text>
            </View>
            {isPasswordUser ? (
              <>
                <Text style={styles.modalFieldLabel}>Enter your password to confirm</Text>
                <View style={styles.modalInput}>
                  <Feather name="lock" size={15} color={colors.textDim} />
                  <TextInput
                    style={[styles.modalTextInput, { flex: 1 }]}
                    value={deletePassword}
                    onChangeText={(v) => { setDeletePassword(v); setDeleteError(''); }}
                    placeholder="Your password" placeholderTextColor={colors.textDim}
                    secureTextEntry autoFocus
                  />
                </View>
              </>
            ) : (
              <View style={[styles.modalInput, { gap: 8 }]}>
                <Feather name="shield" size={15} color={colors.textDim} />
                <Text style={[styles.modalTextInput, { flex: 1, color: colors.textMuted }]} numberOfLines={2}>
                  You&apos;ll confirm with Google to delete your account.
                </Text>
              </View>
            )}
            {!!deleteError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }}>{deleteError}</Text>}
            <View style={[styles.modalBtns, { marginTop: 20 }]}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteModalVisible(false)} disabled={deleteLoading}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.accentRed }, deleteLoading && { opacity: 0.7 }]}
                onPress={confirmDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* Feedback dialog — a plain conditionally-rendered overlay (NOT a RN Modal).
          The RN Modal's portal/transition left the box lingering a frame on close;
          a plain View mounts/unmounts synchronously, so it vanishes instantly. */}
      {feedback ? (
        <View
          style={{ position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 9999 }}
        >
          <View style={[styles.modalBox, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{feedback.title}</Text>
              <TouchableOpacity onPress={dismissFeedback}><Feather name="x" size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            <Text style={styles.modalNote}>{feedback.message}</Text>
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <TouchableOpacity
                onPress={dismissFeedback}
                activeOpacity={0.85}
                style={{ backgroundColor: gold, borderRadius: radius.md, paddingHorizontal: 40, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', minWidth: 120 }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </ScreenLayout>
  );
}

// ── Sub-components ──

function FieldRow({ label, sub, btnLabel, onPress, styles, badgeOnly, testID }: { label: string; sub: string; btnLabel: string; onPress: () => void; styles: any; badgeOnly?: boolean; testID?: string }) {
  return (
    <View style={styles.fieldRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldSub} numberOfLines={1} testID={testID ? `${testID}-value` : undefined}>{sub}</Text>
      </View>
      {badgeOnly ? (
        <TouchableOpacity testID={testID} style={[styles.changeBtn, { borderColor: styles.comingSoonBadge?.borderColor || '#E5A93C40', backgroundColor: styles.comingSoonBadge?.backgroundColor || '#E5A93C18' }]} onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.changeBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity testID={testID} style={styles.changeBtn} onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.changeBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AppModal({ visible, title, onClose, children, styles, colors, testID }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; styles: any; colors: AppColors; testID?: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox} testID={testID}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalButtons({ onCancel, onSave, loading, saveLabel = 'Save Changes', cancelLabel = 'Cancel', styles, saveTestID }: { onCancel: () => void; onSave: () => void; loading: boolean; saveLabel?: string; cancelLabel?: string; styles: any; saveTestID?: string }) {
  return (
    <View style={styles.modalBtns}>
      <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
        <Text style={styles.modalCancelText}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity testID={saveTestID} style={styles.modalSaveBtn} onPress={onSave} disabled={loading}>
        {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>{saveLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 60, flexGrow: 1 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  col: { flex: 1, flexBasis: 0, minWidth: 340, gap: spacing.md },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  avatarBig: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentYellow,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatarCam: {
    position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11,
    backgroundColor: c.cardDark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: c.accentYellow,
  },
  avatarInitial: { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 16, fontWeight: '700', color: c.textMain, marginBottom: 2 },
  profileSub: { fontSize: 12, color: c.textMuted, marginBottom: 6 },
  profileMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: c.accentYellow + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: c.accentYellow + '30',
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: c.accentYellow },

  divider: { height: 1, backgroundColor: c.borderColor, marginVertical: spacing.lg },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: c.textMain, marginBottom: 2 },
  fieldSub: { fontSize: 12, color: c.textMuted, maxWidth: 220 },
  changeBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.sm,
    borderWidth: 1, borderColor: c.accentYellow + '40', backgroundColor: c.accentYellow + '18',
  },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: c.accentYellow },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comingSoonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: c.accentYellow + '18', borderWidth: 1, borderColor: c.accentYellow + '30' },
  comingSoonText: { fontSize: 11, color: c.accentYellow, fontWeight: '600' },

  themeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  themeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1,
    borderColor: c.borderColor, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  themeOptionActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  themeLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 2 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  actionBtn: {
    flex: 1, flexBasis: 0, minWidth: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: radius.md,
    borderWidth: 1, borderColor: c.accentRed + '40', backgroundColor: c.accentRed + '0A',
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  versionText: { textAlign: 'center', fontSize: 12, color: c.textDim, marginTop: spacing.xl },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 440 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 17, fontWeight: '700', color: c.textMain },
  modalNote: { fontSize: 13, color: c.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  modalFieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: spacing.md },
  modalInput: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, height: 46, paddingHorizontal: spacing.lg,
  },
  modalTextInput: { flex: 1, fontSize: 14, color: c.textMain, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: 'white' },
});
