import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import ConnectSchoolBanner from '../../../features/classes/components/ConnectSchoolBanner';
import { useAuth } from '../../../context/AuthContext';
import { useStudentData, formatLevel } from '../../../context/StudentDataContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNotification } from '../../../context/NotificationContext';
import { auth } from '../../../config/firebase';

import type { ModalType } from './types';
import { makeStyles } from './styles';
import { SectionHeader } from './components/shared';
import { useProfilePhoto } from './hooks/useProfilePhoto';
import { useNotificationPrefs } from './hooks/useNotificationPrefs';
import { useProfileFields } from './hooks/useProfileFields';
import { useEmailChange } from '../../shared/account/hooks/useEmailChange';
import { usePasswordChange } from './hooks/usePasswordChange';
import { useRecoveryEmail } from './hooks/useRecoveryEmail';
import { useDeleteAccount } from './hooks/useDeleteAccount';

import ProfileCard from './components/ProfileCard';
import AppearanceCard from './components/AppearanceCard';
import SecurityCard from './components/SecurityCard';
import NotificationsCard from './components/NotificationsCard';
import NameModal from './components/NameModal';
import ChangeEmailModal from '../../shared/account/components/ChangeEmailModal';
import PasswordModal from './components/PasswordModal';
import SSOInfoModal from './components/SSOInfoModal';
import RecoveryModal from './components/RecoveryModal';
import GradeModal from './components/GradeModal';
import CurriculumModal from './components/CurriculumModal';
import LocationModal from './components/LocationModal';
import SignOutModal from './components/SignOutModal';
import DeleteModal from './components/DeleteModal';

export default function SettingsScreen({ navigation, route }: any) {
  const { user, updateUser, logout, refreshProfile } = useAuth();
  const { triggerPoll, clearUnreadAssignments, clearUnreadChallenges, muteCategory } = useNotification();
  // Re-pull profile on focus so a parent's grade/curriculum edit reflects here.
  useFocusEffect(useCallback(() => { refreshProfile(); }, []));
  const { stats } = useStudentData();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const levelLabel = formatLevel(stats.level);

  // Does this account sign in with email+password, or only via Google SSO?
  const isGoogleUser = user?.authProvider === 'google' || (auth.currentUser?.providerData ?? []).some(p => p.providerId === 'google.com');
  const isPasswordUser = !isGoogleUser;

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  function closeModal() {
    setActiveModal(null);
  }

  const photo = useProfilePhoto(user?.email, (user as any)?.photoUrl ?? null, updateUser);
  const profileFields = useProfileFields(user, updateUser, closeModal);
  const emailChange = useEmailChange({ email: user?.email, name: user?.name, isGoogleUser });
  const passwordChange = usePasswordChange(user, updateUser, closeModal);
  const recoveryEmail = useRecoveryEmail(user?.email, closeModal);
  const deleteAccount = useDeleteAccount(isPasswordUser, isGoogleUser, logout);
  const notifPrefs = useNotificationPrefs(user?.email, triggerPoll, clearUnreadAssignments, clearUnreadChallenges, muteCategory, recoveryEmail.setRecoverySaved);

  function openModal(type: ModalType) {
    profileFields.resetForm();
    emailChange.reset();
    passwordChange.resetForm();
    recoveryEmail.resetForm();
    setActiveModal(type);
  }

  const scrollRef = useRef<any>(null);
  const notifRef = useRef<any>(null);
  const notifY = useRef<number>(0);
  const securityY = useRef<number>(0);

  // Scroll to a specific section if navigated with a section param
  useEffect(() => {
    const section = route?.params?.section;
    if (!section) return;
    const yMap: Record<string, React.MutableRefObject<number>> = {
      notifications: notifY,
      security: securityY,
    };
    const target = yMap[section];
    if (target) {
      setTimeout(() => {
        scrollRef.current?.scrollTo?.({ y: target.current, animated: true });
      }, 350);
    }
  }, [route?.params?.section]);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Settings"
          subtitle="Manage your preferences and account details."
          searchPlaceholder="Search settings..."
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ConnectSchoolBanner />
          <View style={styles.columns}>
            <View style={styles.col}>
              <SectionHeader icon="user" label="Profile & Account" color={colors.accentYellow} styles={styles} />
              <ProfileCard
                user={user}
                levelLabel={levelLabel}
                photoUrl={photo.photoUrl}
                uploading={photo.uploading}
                onPickPhoto={photo.handlePickPhoto}
                onOpenModal={openModal}
                colors={colors}
                styles={styles}
              />

              <SectionHeader icon="moon" label="Appearance" color={colors.accentYellow} styles={styles} />
              <AppearanceCard themeMode={themeMode} setThemeMode={setThemeMode} colors={colors} styles={styles} />
            </View>

            <View style={styles.col}>
              <View onLayout={e => { securityY.current = e.nativeEvent.layout.y; }}>
                <SectionHeader icon="shield" label="Security" color={colors.accentGreen} styles={styles} />
                <SecurityCard
                  isPasswordUser={isPasswordUser}
                  recoverySaved={recoveryEmail.recoverySaved}
                  onOpenModal={openModal}
                  colors={colors}
                  styles={styles}
                />
              </View>

              <View ref={notifRef} onLayout={e => { notifY.current = e.nativeEvent.layout.y; }}>
                <SectionHeader icon="bell" label="Notifications" color={colors.accentYellow} styles={styles} />
                <NotificationsCard
                  assignmentAlerts={notifPrefs.assignmentAlerts}
                  challengeUpdates={notifPrefs.challengeUpdates}
                  onToggleAssignmentAlerts={notifPrefs.toggleAssignmentAlerts}
                  onToggleChallengeUpdates={notifPrefs.toggleChallengeUpdates}
                  colors={colors}
                  styles={styles}
                />
              </View>
            </View>
          </View>

          {/* ── Account Actions ── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setSignOutModalVisible(true)} activeOpacity={0.8} testID="settings-signout-button">
              <Feather name="log-out" size={17} color={colors.accentRed} />
              <Text style={[styles.actionBtnText, { color: colors.accentRed }]}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={deleteAccount.openDeleteModal} activeOpacity={0.8} testID="settings-delete-account-button">
              <Feather name="trash-2" size={17} color={colors.accentRed} />
              <Text style={[styles.actionBtnText, { color: colors.accentRed }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Aivorah v1.0.0 · Build 2024</Text>
        </ScrollView>
      </View>

      <NameModal
        visible={activeModal === 'name'}
        onClose={closeModal}
        newName={profileFields.newName}
        setNewName={profileFields.setNewName}
        nameError={profileFields.nameError}
        setNameError={profileFields.setNameError}
        onSave={profileFields.handleSaveName}
        loading={false}
        colors={colors}
        styles={styles}
      />

      <ChangeEmailModal
        visible={activeModal === 'email'}
        onClose={closeModal}
        onSignOut={() => { closeModal(); logout(); }}
        userEmail={user?.email}
        emailChange={emailChange}
        colors={colors}
        styles={styles}
      />

      <SSOInfoModal
        visible={activeModal === 'ssoInfo' || (activeModal === 'password' && !isPasswordUser)}
        onClose={closeModal}
        colors={colors}
        styles={styles}
      />

      <PasswordModal
        visible={activeModal === 'password' && isPasswordUser}
        onClose={closeModal}
        currentPassword={passwordChange.currentPassword}
        setCurrentPassword={passwordChange.setCurrentPassword}
        newPassword={passwordChange.newPassword}
        setNewPassword={passwordChange.setNewPassword}
        confirmPassword={passwordChange.confirmPassword}
        setConfirmPassword={passwordChange.setConfirmPassword}
        showCurrent={passwordChange.showCurrent}
        setShowCurrent={passwordChange.setShowCurrent}
        showNew={passwordChange.showNew}
        setShowNew={passwordChange.setShowNew}
        passwordError={passwordChange.passwordError}
        modalLoading={passwordChange.modalLoading}
        onSave={passwordChange.handleChangePassword}
        colors={colors}
        styles={styles}
      />

      <RecoveryModal
        visible={activeModal === 'recovery'}
        onClose={closeModal}
        recoveryStep={recoveryEmail.recoveryStep}
        setRecoveryStep={recoveryEmail.setRecoveryStep}
        recoveryEmail={recoveryEmail.recoveryEmail}
        setRecoveryEmail={recoveryEmail.setRecoveryEmail}
        setRecoveryError={recoveryEmail.setRecoveryError}
        recoveryOtp={recoveryEmail.recoveryOtp}
        setRecoveryOtp={recoveryEmail.setRecoveryOtp}
        recoveryError={recoveryEmail.recoveryError}
        recoverySending={recoveryEmail.recoverySending}
        modalLoading={recoveryEmail.modalLoading}
        onSendCode={recoveryEmail.handleSendRecoveryCode}
        onVerifyOtp={recoveryEmail.handleVerifyRecoveryOtp}
        colors={colors}
        styles={styles}
      />

      <SignOutModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirm={() => { setSignOutModalVisible(false); logout(); }}
        colors={colors}
        styles={styles}
      />

      <DeleteModal
        visible={deleteAccount.deleteModalVisible}
        onClose={() => deleteAccount.setDeleteModalVisible(false)}
        isPasswordUser={isPasswordUser}
        deletePassword={deleteAccount.deletePassword}
        setDeletePassword={deleteAccount.setDeletePassword}
        setDeleteError={deleteAccount.setDeleteError}
        deleteError={deleteAccount.deleteError}
        deleteLoading={deleteAccount.deleteLoading}
        onConfirm={deleteAccount.confirmDeleteAccount}
        colors={colors}
        styles={styles}
      />

      <GradeModal
        visible={activeModal === 'grade'}
        onClose={closeModal}
        grades={profileFields.GRADES}
        selectedGrade={profileFields.selectedGrade}
        setSelectedGrade={profileFields.setSelectedGrade}
        gradeLoading={profileFields.gradeLoading}
        onSave={profileFields.handleSaveGrade}
        error={profileFields.gradeError}
        colors={colors}
        styles={styles}
      />

      <CurriculumModal
        visible={activeModal === 'curriculum'}
        onClose={closeModal}
        selectedCurriculum={profileFields.selectedCurriculum}
        setSelectedCurriculum={profileFields.setSelectedCurriculum}
        curriculumLoading={profileFields.curriculumLoading}
        onSave={profileFields.handleSaveCurriculum}
        error={profileFields.curriculumError}
        needsGrade={profileFields.curriculumNeedsGrade}
        selectedGrade={profileFields.selectedGrade}
        setSelectedGrade={profileFields.setSelectedGrade}
        colors={colors}
        styles={styles}
      />

      <LocationModal
        visible={activeModal === 'location'}
        onClose={closeModal}
        newLocation={profileFields.newLocation}
        setNewLocation={profileFields.setNewLocation}
        locationLoading={profileFields.locationLoading}
        onSave={profileFields.handleSaveLocation}
        colors={colors}
        styles={styles}
      />
    </ScreenLayout>
  );
}
