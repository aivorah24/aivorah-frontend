import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { LEARNING_STYLES, SUBJECT_OPTIONS, CARTOON_OPTIONS } from './constants';
import { useProfile } from './hooks/useProfile';
import { ProfileHero } from './components/ProfileHero';
import { AvatarPickerCard } from './components/AvatarPickerCard';
import { LearningStyleCard } from './components/LearningStyleCard';
import { SubjectsCard } from './components/SubjectsCard';
import { LearningBuddyCard } from './components/LearningBuddyCard';
import { AccountCard } from './components/AccountCard';
import { EditProfileModal } from './components/EditProfileModal';
import { SignOutModal } from './components/SignOutModal';

// ────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const p = useProfile();

  // The hero card sits on a light pastel gradient in light mode — the theme's
  // standard accentGreen/accentYellow (tuned for dark backgrounds, or plain
  // cream at best) read as washed-out/low-contrast there. Darker, hero-specific
  // values only for light mode; dark mode keeps the normal theme colors.
  const heroGreen = isDark ? colors.accentGreen : '#3F6B54';
  const heroGold = isDark ? colors.accentYellow : '#6B5219';

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="My Profile" />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <ProfileHero
            styles={styles}
            colors={colors}
            isDark={isDark}
            user={p.user}
            photoUrl={p.photoUrl}
            uploading={p.uploading}
            currentAvatar={p.currentAvatar}
            heroGreen={heroGreen}
            heroGold={heroGold}
            onEditPress={() => p.setEditVisible(true)}
            onPickPhoto={p.handlePickPhoto}
            onNavigateSubscription={() => navigation.navigate('Subscription')}
          />

          <AvatarPickerCard
            styles={styles}
            colors={colors}
            isDark={isDark}
            avatars={p.AVATARS}
            selAvatar={p.selAvatar}
            photoUrl={p.photoUrl}
            onSelectAvatar={p.handleSelectAvatar}
          />

          <LearningStyleCard
            styles={styles}
            colors={colors}
            isDark={isDark}
            learningStyles={LEARNING_STYLES}
            learningStyle={p.learningStyle}
            onSelect={p.handleSelectLearningStyle}
          />

          <SubjectsCard
            styles={styles}
            colors={colors}
            isDark={isDark}
            subjectOptions={SUBJECT_OPTIONS}
            interests={p.interests}
            onToggleInterest={p.toggleInterest}
          />

          <LearningBuddyCard
            styles={styles}
            colors={colors}
            isDark={isDark}
            cartoonOptions={CARTOON_OPTIONS}
          />

          <AccountCard
            styles={styles}
            colors={colors}
            isDark={isDark}
            onNotifications={() => navigation?.navigate?.('Settings', { section: 'notifications' })}
            onPrivacy={() => navigation?.navigate?.('Settings', { section: 'security' })}
            onHelpCenter={() => navigation?.navigate?.('HelpCenter')}
            onSignOut={() => p.setSignOutVisible(true)}
          />

        </ScrollView>

        <EditProfileModal
          styles={styles}
          colors={colors}
          visible={p.editVisible}
          onClose={() => p.setEditVisible(false)}
          editName={p.editName}
          setEditName={p.setEditName}
          editCurriculum={p.editCurriculum}
          setEditCurriculum={p.setEditCurriculum}
          editGrade={p.editGrade}
          setEditGrade={p.setEditGrade}
          editLocation={p.editLocation}
          setEditLocation={p.setEditLocation}
          editSchool={p.editSchool}
          setEditSchool={p.setEditSchool}
          editBio={p.editBio}
          setEditBio={p.setEditBio}
          locating={p.locating}
          setLocating={p.setLocating}
          saveProfileLoading={p.saveProfileLoading}
          saveProfileError={p.saveProfileError}
          onSave={p.handleSaveProfile}
        />

        <SignOutModal
          colors={colors}
          visible={p.signOutVisible}
          onCancel={() => p.setSignOutVisible(false)}
          onConfirm={() => { p.setSignOutVisible(false); p.logout(); }}
        />
      </View>
    </ScreenLayout>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
export const makeStyles = (c: AppColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48, gap: spacing.lg },

  // Hero
  heroCard: {
    borderRadius: radius.xl, overflow: 'hidden',
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: spacing.xl,
    borderWidth: 1, borderColor: c.borderColor,
    gap: 10,
  },
  heroBg: { ...StyleSheet.absoluteFillObject },
  editCornerBtn: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.sm, borderWidth: 1, borderColor: isDark ? 'rgba(147,176,172,0.4)' : 'rgba(95,138,134,0.4)',
    backgroundColor: isDark ? 'rgba(147,176,172,0.12)' : 'rgba(195,220,216,0.3)',
  },
  editCornerText: { fontSize: 11, fontWeight: '700', color: c.accentYellow },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarPhoto: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: c.accentYellow },
  avatarGrad: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  cameraRing: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: isDark ? '#1E1E1E' : '#252525', borderWidth: 2, borderColor: isDark ? '#111111' : '#F9F3F4',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 22, fontWeight: '800', color: c.textMain, letterSpacing: -0.4, fontFamily: fonts.serif },
  heroBio: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: -4 },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl,
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },

  // Avatar picker
  avOption: { alignItems: 'center', marginRight: spacing.xl, gap: 7 },
  avRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avCheck: { position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.cardDark },
  avLabel: { fontSize: 11, color: c.textMuted, fontWeight: '500' },

  // Learning style
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  styleCard: {
    width: '48%',
    borderWidth: 1.5, borderColor: c.borderColor, borderRadius: radius.lg,
    padding: spacing.lg, gap: 6, position: 'relative',
    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  },
  styleIconWrap: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  styleLabel: { fontSize: 13, fontWeight: '700', color: c.textMain },
  styleDesc: { fontSize: 11, color: c.textDim, lineHeight: 15 },
  styleCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  // Interests / buddy chips
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.lg, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: c.borderColor,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  },
  interestText: { fontSize: 13, color: c.textMuted, fontWeight: '500' },

  comingSoonBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  comingSoonText: { fontSize: 11, fontWeight: '700' },

  smallBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1, borderColor: c.borderColor },
  smallBtnActive: { borderColor: c.accentYellow + '50', backgroundColor: c.accentYellow + '15' },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: c.textDim },

  customInput: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, backgroundColor: c.cardHover, borderWidth: 1, borderColor: c.accentYellow + '50',
    borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 44,
  },
  customInputText: { flex: 1, fontSize: 14, color: c.textMain },

  // Account
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  accountIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  accountLabel: { fontSize: 14, fontWeight: '600', color: c.textMain },
  accountSub: { fontSize: 11, color: c.textDim, marginTop: 1 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalBox: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 440, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalScroll: { flexGrow: 1, flexShrink: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.textMain, fontFamily: fonts.serif },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6, marginTop: spacing.md },
  lblRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.md, height: 46, paddingHorizontal: spacing.lg },
  input: { flex: 1, fontSize: 14, color: c.textMain, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  // SelectField/AutocompleteField (from onboarding) render their box directly
  // via `styles.input` with no separate bordered wrapper — unlike this file's
  // own fields, which get their border from `inputRow`. Give those shared
  // components a self-contained bordered variant so they don't render as bare
  // underlined text.
  pickerInput: {
    height: 46, backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: 14, color: c.textMain,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  // Onboarding-style pickers reused in Edit Profile (curriculum / grade / location)
  locateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locateTxt: { fontSize: 11, fontWeight: '700', color: c.accentYellow },
  hintTxt: { fontSize: 11, color: c.textDim },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark },
  chipActive: { backgroundColor: c.accentYellow + '20', borderColor: c.accentYellow },
  chipTxt: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  chipTxtActive: { color: c.accentYellow },
  radioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  radioTile: {
    flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.bgDark,
  },
  radioTileActive: { borderColor: c.accentYellow, backgroundColor: c.accentYellow + '10' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accentYellow },
  dropdown: { marginTop: 6, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: 10, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.borderColor },
  dropdownTxt: { fontSize: 13, color: c.textMain },

  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  cancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  saveBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: 'white' },
});
