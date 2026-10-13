import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import ConnectSchoolBanner from '../../../features/classes/components/ConnectSchoolBanner';
import { getAvatarGradient, getAvatarIcon } from '../../../constants/avatarStyles';
import { useTheme } from '../../../context/ThemeContext';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { useParentSettingsData } from './hooks/useParentSettingsData';
import { useNotificationPrefs } from './hooks/useNotificationPrefs';
import SectionHeader from './components/SectionHeader';
import FieldRow from './components/FieldRow';
import NotificationsCard from './components/NotificationsCard';
import AppearanceCard from './components/AppearanceCard';
import NameModal from './components/NameModal';
import LocationModal from './components/LocationModal';
import ChangeEmailModal from '../../shared/account/components/ChangeEmailModal';
import { useEmailChange } from '../../shared/account/hooks/useEmailChange';
import PasswordModal from './components/PasswordModal';
import SsoInfoModal from './components/SsoInfoModal';
import DeleteAccountModal from './components/DeleteAccountModal';
import type { NotificationPrefs } from './types';

export default function ParentSettingsScreen({ navigation }: any) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { triggerPoll, clearUnreadAssignments, clearUnreadChallenges, muteCategory } = useNotification();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const data = useParentSettingsData();
  const { prefs, setPref } = useNotificationPrefs(data.user?.email);

  async function handleToggleNotif(key: keyof NotificationPrefs, value: boolean) {
    // Hide a muted category from the bell at once; the poll then reads the saved pref.
    if (!value && (key === 'assignmentAlerts' || key === 'challengeUpdates')) muteCategory(key);
    await setPref(key, value);
    if (value && key === 'assignmentAlerts') clearUnreadAssignments();
    else if (value && key === 'challengeUpdates') clearUnreadChallenges();
    else triggerPoll();
  }

  const { user } = data;
  const { logout } = useAuth();
  const emailChange = useEmailChange({ email: user?.email, name: user?.name, isGoogleUser: data.isGoogleUser });

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Settings" subtitle="Manage your preferences and account" onMenuPress={() => navigation.openDrawer()} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ConnectSchoolBanner />
          <View style={styles.columns}>
            <View style={styles.col}>
              <SectionHeader icon="user" label="Profile & Account" color={colors.accentYellow} styles={styles} />
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <TouchableOpacity style={styles.avatarBig} onPress={data.handlePickPhoto} activeOpacity={0.85}>
                    {data.photoUrl ? (
                      <Image source={{ uri: data.photoUrl }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
                    ) : (user as any)?.avatarStyle ? (
                      <LinearGradient
                        colors={getAvatarGradient((user as any).avatarStyle)}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: '100%', height: '100%', borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Feather name={getAvatarIcon((user as any).avatarStyle) as any} size={28} color="white" />
                      </LinearGradient>
                    ) : (
                      <Text style={styles.avatarInitial}>{user?.name ? user.name[0].toUpperCase() : 'P'}</Text>
                    )}
                    <View style={styles.avatarCam}>
                      {data.uploading ? <ActivityIndicator size="small" color={colors.accentYellow} /> : <Feather name="camera" size={11} color={colors.accentYellow} />}
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{user?.name || 'Parent'}</Text>
                    <Text style={styles.profileSub}>{user?.email || ''}</Text>
                    <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>Parent</Text></View>
                  </View>
                </View>
                <View style={styles.divider} />
                <FieldRow label="Display Name" sub={user?.name || '—'} btnLabel="Change" onPress={() => data.openModal('name')} styles={styles} />
                <View style={styles.divider} />
                <FieldRow label="Email Address" sub={user?.email || '—'} btnLabel="Change" onPress={() => { emailChange.reset(); data.openModal('email'); }} styles={styles} />
                <View style={styles.divider} />
                <FieldRow label="Location" sub={user?.location || 'Not set'} btnLabel="Update" onPress={() => data.openModal('location')} styles={styles} />
              </View>

              <SectionHeader icon="shield" label="Security" color={colors.accentGreen} styles={styles} />
              <View style={styles.card}>
                <FieldRow
                  label="Password"
                  sub={data.isPasswordUser ? 'Change your account password' : 'Managed via Google Sign-In'}
                  btnLabel={data.isPasswordUser ? 'Change' : 'Google SSO'}
                  badgeOnly={!data.isPasswordUser}
                  onPress={data.isPasswordUser ? () => data.openModal('password') : () => data.openModal('ssoInfo' as any)}
                  styles={styles}
                />
                <View style={styles.divider} />
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Two-Factor Auth</Text>
                    <Text style={styles.fieldSub}>Add an extra layer of security</Text>
                  </View>
                  <View style={styles.comingSoonBadge}><Text style={styles.comingSoonText}>Soon</Text></View>
                </View>
              </View>
            </View>

            <View style={styles.col}>
              <SectionHeader icon="bell" label="Notifications" color={colors.accentYellow} styles={styles} />
              <NotificationsCard prefs={prefs} onToggle={handleToggleNotif} styles={styles} colors={colors} />

              <SectionHeader icon="moon" label="Appearance" color={colors.accentPurple} styles={styles} />
              <AppearanceCard themeMode={themeMode} setThemeMode={setThemeMode} styles={styles} colors={colors} />
            </View>
          </View>

          <SectionHeader icon="alert-triangle" label="Account Actions" color={colors.accentRed} styles={styles} />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={data.handleSignOut} activeOpacity={0.8}>
              <Feather name="log-out" size={17} color={colors.accentRed} />
              <Text style={[styles.actionBtnText, { color: colors.accentRed }]}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={data.openDeleteModal} activeOpacity={0.8}>
              <Feather name="trash-2" size={17} color={colors.accentRed} />
              <Text style={[styles.actionBtnText, { color: colors.accentRed }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>Aivorah v1.0.0 · NuShift</Text>
        </ScrollView>
      </View>

      <NameModal visible={data.activeModal === 'name'} data={data} styles={styles} colors={colors} />
      <ChangeEmailModal
        visible={data.activeModal === 'email'}
        onClose={data.closeModal}
        onSignOut={() => { data.closeModal(); logout(); }}
        userEmail={user?.email}
        emailChange={emailChange}
        styles={styles}
        colors={colors}
      />
      <SsoInfoModal
        visible={data.activeModal === 'ssoInfo' || (data.activeModal === 'password' && !data.isPasswordUser)}
        onClose={data.closeModal}
        styles={styles}
        colors={colors}
      />
      <PasswordModal visible={data.activeModal === 'password' && data.isPasswordUser} data={data} styles={styles} colors={colors} />
      <LocationModal visible={data.activeModal === 'location'} data={data} styles={styles} colors={colors} />
      <DeleteAccountModal visible={data.deleteModalVisible} data={data} styles={styles} colors={colors} />
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  col: { flex: 1, flexBasis: 0, minWidth: 340, gap: spacing.md },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  avatarBig: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarCam: {
    position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11,
    backgroundColor: c.cardDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.accentYellow,
  },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '800', color: '#fff' },
  profileName: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: c.textMain, marginBottom: 2 },
  profileSub: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: c.accentYellow + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', color: c.accentYellow },

  divider: { height: 1, backgroundColor: c.borderColor, marginVertical: spacing.lg },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  fieldLabel: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMain, marginBottom: 2 },
  fieldSub: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, maxWidth: 200 },
  changeBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: c.accentYellow + '40', backgroundColor: c.accentYellow + '18' },
  changeBtnText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: c.accentYellow },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comingSoonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: c.accentYellow + '18', borderWidth: 1, borderColor: c.accentYellow + '30' },
  comingSoonText: { fontFamily: fonts.serif, fontSize: 11, color: c.accentYellow, fontWeight: '600' },

  themeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  themeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  themeOptionActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '18' },
  themeLabel: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: c.textMuted },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  actionBtn: {
    flex: 1, flexBasis: 0, minWidth: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: radius.md, borderWidth: 1, borderColor: c.accentRed + '40', backgroundColor: c.accentRed + '0A',
  },
  actionBtnText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  versionText: { textAlign: 'center', fontFamily: fonts.serif, fontSize: 12, color: c.textDim, marginTop: spacing.xl },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 440 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700', color: c.textMain },
  modalNote: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  modalFieldLabel: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: spacing.md },
  modalInput: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.bgDark, borderWidth: 1,
    borderColor: c.borderColor, borderRadius: radius.md, height: 46, paddingHorizontal: spacing.lg,
  },
  modalTextInput: { flex: 1, fontFamily: fonts.serif, fontSize: 14, color: c.textMain },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMuted },
  modalSaveBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: '#0B0B0B' },
});
