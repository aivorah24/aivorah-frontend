import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

import { useParentProfileData } from './hooks/useParentProfileData';
import { useChangePassword } from './hooks/useChangePassword';
import { saveProfile } from './services/parentProfileService';
import { formatStudyTime } from './utils/formatStudyTime';

import ProfileHeroCard from './components/ProfileHeroCard';
import ProfileInfoCard from './components/ProfileInfoCard';
import ActivityOverviewCard from './components/ActivityOverviewCard';
import SecurityAccountCard from './components/SecurityAccountCard';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import EditProfileModal from './components/modals/EditProfileModal';

export default function ParentProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const email = user?.email ?? '';
  const parentEmail = user?.email || '';

  const { phone, setPhone, city, setCity, children, weeklyActivity } = useParentProfileData(email, parentEmail);
  const passwordFlow = useChangePassword(email);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function pickPhoto() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) setPhotoUri(URL.createObjectURL(file));
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  const nameParts = (user?.name ?? '').split(' ');
  const firstName = nameParts[0] || '';

  function openEdit() {
    setEditName(user?.name ?? '');
    setEditPhone(phone);
    setEditCity(city);
    setEditVisible(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await saveProfile({ email, name: editName.trim(), location: editCity.trim(), phone: editPhone.trim(), role: 'parent' });
      setPhone(editPhone.trim());
      setCity(editCity.trim());
      updateUser({ name: editName.trim(), location: editCity.trim() } as any);
      setEditVisible(false);
    } catch {}
    setSaving(false);
  }

  const totalStudyMins = weeklyActivity.reduce((a, b) => a + b, 0);
  const totalStudyDisplay = formatStudyTime(totalStudyMins);
  const activeDays = weeklyActivity.filter(m => m > 0).length;

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Profile"
          subtitle="Manage your account"
          searchPlaceholder="Search parent settings..."
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ProfileHeroCard
              firstName={firstName}
              userName={user?.name ?? 'Parent'}
              photoUri={photoUri}
              onPickPhoto={pickPhoto}
              onEdit={openEdit}
              colors={colors}
              s={styles}
            />

            <View style={styles.twoCol}>
              <ProfileInfoCard name={user?.name || firstName || ''} email={email} phone={phone} city={city} colors={colors} s={styles} />
              <ActivityOverviewCard activeDays={activeDays} totalStudyDisplay={totalStudyDisplay} childrenCount={children.length} colors={colors} s={styles} />
            </View>

            <SecurityAccountCard
              onChangePassword={passwordFlow.openPassModal}
              onEdit={openEdit}
              onNavigate={(screen) => navigation.navigate(screen)}
              colors={colors}
              s={styles}
            />
        </ScrollView>
      </View>

      <ChangePasswordModal
        visible={passwordFlow.passModalVisible}
        onClose={() => passwordFlow.setPassModalVisible(false)}
        currentPass={passwordFlow.currentPass} setCurrentPass={passwordFlow.setCurrentPass}
        newPass={passwordFlow.newPass} setNewPass={passwordFlow.setNewPass}
        confirmPass={passwordFlow.confirmPass} setConfirmPass={passwordFlow.setConfirmPass}
        passError={passwordFlow.passError} passSuccess={passwordFlow.passSuccess} passLoading={passwordFlow.passLoading}
        onSubmit={passwordFlow.handleChangePassword}
        colors={colors} s={styles}
      />

      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        editName={editName} setEditName={setEditName}
        email={email}
        editPhone={editPhone} setEditPhone={setEditPhone}
        editCity={editCity} setEditCity={setEditCity}
        saving={saving}
        onSave={saveEdit}
        colors={colors} s={styles}
      />
    </ScreenLayout>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bgDark },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 48 },

  // ── Hero ──
  heroCard: {
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg, gap: 16, flexWrap: 'wrap',
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 18, flexShrink: 1 },
  heroAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: c.accentYellow + '18', borderWidth: 3, borderColor: c.accentYellow,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroAvatarText: { fontSize: 32, fontWeight: '700', fontFamily: fonts.serif, color: c.accentYellow },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: c.accentYellow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: c.cardDark,
  },
  heroWelcome: { fontSize: 13, fontFamily: fonts.sans, color: c.textMuted },
  heroName: { fontSize: 26, fontWeight: '700', fontFamily: fonts.serif, color: c.textMain },
  heroTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.accentGreen + '40', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroTagText: { fontSize: 11, fontWeight: '600', fontFamily: fonts.sans },

  // Quote panel
  heroQuote: {
    flex: 1, minWidth: 180, backgroundColor: c.cardDark, borderRadius: 14,
    borderWidth: 1, borderColor: c.accentYellow + '30',
    padding: 18, gap: 4, justifyContent: 'center',
  },
  quoteGlyph: { fontSize: 28, color: c.accentYellow, lineHeight: 28, fontFamily: fonts.serif },
  quoteText: { fontSize: 15, color: c.textMain, lineHeight: 22, fontFamily: fonts.serif },
  quoteHighlight: { color: c.accentYellow, fontWeight: '700', fontFamily: fonts.serif },
  sparkleRow: { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' },
  sparkleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accentYellow + '70' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: c.accentYellow, paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 999, flexShrink: 0,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', fontFamily: fonts.sans, color: '#0B0B0B' },

  // ── Two-col layout ──
  twoCol: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 280,
    backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', fontFamily: fonts.serif, color: c.textMain },
  weekBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  weekBadgeText: { fontSize: 11, fontWeight: '600', fontFamily: fonts.sans, color: c.textMuted },

  // Profile info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 140, flexShrink: 0 },
  infoLabel: { fontSize: 13, fontFamily: fonts.sans, color: c.textMuted },
  infoValue: { flex: 1, fontSize: 14, fontFamily: fonts.sans, color: c.textMain, fontWeight: '500' },

  // Stats grid in activity
  statsGrid: {
    flexDirection: 'row', borderWidth: 1, borderColor: c.borderColor,
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg,
  },
  statCell: { flex: 1, padding: 14, alignItems: 'center', gap: 4 },
  statDividerV: { width: 1, backgroundColor: c.borderColor },
  statBig: { fontSize: 22, fontWeight: '800', fontFamily: fonts.serif, color: c.textMain },
  statSmallLabel: { fontSize: 9, fontFamily: fonts.sans, color: c.textDim, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' },

  // Security section
  secHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
  secSub: { fontSize: 11, fontFamily: fonts.sans, color: c.textMuted, marginTop: 2 },
  changePassBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: c.accentYellow + '50', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
  },
  changePassText: { fontSize: 12, fontWeight: '600', fontFamily: fonts.sans, color: c.accentYellow },

  secTilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  secTile: {
    flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.borderColor,
    borderRadius: 14, padding: 14,
  },
  secTileIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: c.accentYellow + '15', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  secTileTitle: { fontSize: 13, fontWeight: '700', fontFamily: fonts.sans, color: c.textMain },
  secTileSub: { fontSize: 11, fontFamily: fonts.sans, color: c.textMuted },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: {
    width: '100%', maxWidth: 440,
    backgroundColor: c.cardDark, borderRadius: 20, borderWidth: 1,
    borderColor: c.accentYellow + '30', padding: spacing.xl, gap: spacing.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: fonts.serif, color: c.textMain },
  modalLabel: { fontSize: 11, fontWeight: '700', fontFamily: fonts.sans, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    height: 46, backgroundColor: c.bgDark, borderWidth: 1, borderColor: c.accentYellow + '25',
    borderRadius: 12, paddingHorizontal: spacing.md, fontSize: 14, fontFamily: fonts.sans, color: c.textMain,
  },
  saveBtn: { backgroundColor: c.accentYellow, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { fontSize: 15, fontWeight: '700', fontFamily: fonts.sans, color: '#0B0B0B' },
});
