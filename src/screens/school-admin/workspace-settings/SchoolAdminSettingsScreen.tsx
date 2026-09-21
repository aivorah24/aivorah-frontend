import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { roleLabel } from '../../../constants/roleLabels';
import { useToast } from '../../../components/common/Toast';
import { useWorkspaceSettings } from './hooks/useWorkspaceSettings';
import YearField from './components/YearField';
import SectionCard, { Row } from './components/SectionCard';

export default function SchoolAdminSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const {
    school, logoUrl, loading,
    editing, draft, saving, saveError, uploadingLogo,
    startEdit, cancelEdit, setDraftField, save, uploadLogo, academicYears,
  } = useWorkspaceSettings(user?.email);

  async function handleSave() {
    const ok = await save();
    if (ok) showToast({ title: 'Workspace settings saved', type: 'success' });
  }

  // Web-only (this console runs on web); the button is hidden on native.
  function handleUploadLogo() {
    if (Platform.OS !== 'web' || !school.name) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/svg+xml,image/jpeg';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1];
        if (!base64) { showToast({ title: 'Could not read that image', type: 'error' }); return; }
        try {
          await uploadLogo(base64, file.type || 'image/png');
          showToast({ title: 'Logo updated', type: 'success' });
        } catch (err: any) {
          showToast({ title: 'Logo upload failed', subtitle: err?.message, type: 'error' });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  const monogram = (school.name || 'A').trim().slice(0, 1).toUpperCase();

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Workspace Settings"
          subtitle="Configuration for your school's Aivorah workspace"
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : (
            <>
              <SectionCard
                colors={colors}
                title="General"
                subtitle="Your school's core identity"
                right={!editing ? (
                  <TouchableOpacity style={styles.editBtn} onPress={startEdit} accessibilityRole="button">
                    <Feather name="edit-2" size={12} color={colors.accentYellow} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                ) : undefined}
              >
                <View style={styles.fieldGrid}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>School name</Text>
                    {editing ? (
                      <TextInput
                        style={[styles.fieldBox, styles.textInput]}
                        value={draft.name}
                        onChangeText={(v) => setDraftField('name', v)}
                        placeholder="Your school's name"
                        placeholderTextColor={colors.textDim}
                      />
                    ) : (
                      <View style={[styles.fieldBox, styles.fieldBoxReadonly]}>
                        <Text style={styles.fieldBoxText} numberOfLines={1}>{school.name || '—'}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>Academic year</Text>
                    {editing ? (
                      <YearField value={draft.academicYear} onChange={(v) => setDraftField('academicYear', v)} colors={colors} years={academicYears} />
                    ) : (
                      <View style={[styles.fieldBox, styles.fieldBoxReadonly]}>
                        <Text style={styles.fieldBoxText}>{school.academicYear ? school.academicYear.replace('-', '–') : 'Not set'}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Contact email</Text>
                  {editing ? (
                    <TextInput
                      style={[styles.fieldBox, styles.textInput]}
                      value={draft.contactEmail}
                      onChangeText={(v) => setDraftField('contactEmail', v)}
                      placeholder="office@yourschool.edu"
                      placeholderTextColor={colors.textDim}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  ) : (
                    <View style={[styles.fieldBox, styles.fieldBoxReadonly]}>
                      <Text style={styles.fieldBoxText}>{school.contactEmail || 'Not set'}</Text>
                    </View>
                  )}
                </View>
              </SectionCard>

              <SectionCard colors={colors} title="Branding" subtitle="How your school is represented across its workspace">
                <View style={styles.brandRow}>
                  <View style={styles.brandLogo}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.brandLogoImg} />
                    ) : (
                      <Text style={styles.brandMonogram}>{monogram}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.brandName}>School logo</Text>
                    <Text style={styles.brandSub}>Shown in the sidebar, announcements, and parent communications. PNG or SVG, at least 128×128.</Text>
                  </View>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadLogo} disabled={uploadingLogo} accessibilityRole="button" accessibilityLabel="Upload logo">
                      {uploadingLogo
                        ? <ActivityIndicator size="small" color={colors.textHeading} />
                        : <Text style={styles.uploadBtnText}>Upload logo</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              </SectionCard>

              <SectionCard colors={colors} title="Administrators & Access" subtitle="Your role and scope on this workspace">
                <Row colors={colors} label="Administrator" value={user?.name || user?.email || '—'} />
                <Row colors={colors} label="Role" value={roleLabel(user?.role)} />
                <Row colors={colors} label="Access scope" value="This school only" last />
                <View style={styles.hintWrap}>
                  <Text style={styles.hint}>Additional administrators can be granted access by the Aivorah team.</Text>
                </View>
              </SectionCard>

              {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}

              {editing && (
                <View style={styles.pageFooter}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving} accessibilityRole="button">
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={saving}
                    accessibilityRole="button"
                  >
                    {saving ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
      {ToastComponent}
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, maxWidth: 720, width: '100%', alignSelf: 'center' },
    fieldGrid: { flexDirection: 'row', gap: spacing.md },
    fieldHalf: { flex: 1, gap: 6 },
    field: { gap: 6 },
    fieldLabel: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: colors.textMuted },
    fieldBox: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark,
      borderRadius: radius.sm, paddingHorizontal: 12, height: 42,
    },
    fieldBoxReadonly: { opacity: 0.7 },
    fieldBoxText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textHeading, flexShrink: 1 },
    textInput: { fontFamily: fonts.serif, fontSize: 13, color: colors.textHeading, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
    errorText: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentRed, marginBottom: spacing.md },
    pageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    editBtnText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
    cancelBtn: {
      paddingHorizontal: 16, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    cancelBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    saveBtn: {
      paddingHorizontal: 20, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.accentYellow,
    },
    saveBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    brandLogo: {
      width: 52, height: 52, borderRadius: radius.sm, backgroundColor: `${colors.accentYellow}22`,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
    },
    brandLogoImg: { width: '100%', height: '100%' },
    brandMonogram: { fontFamily: fonts.serif, fontSize: 20, fontWeight: '700', color: colors.accentYellow },
    brandName: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: colors.textHeading },
    brandSub: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
    uploadBtn: {
      paddingHorizontal: 16, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark, flexShrink: 0,
    },
    uploadBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    hintWrap: { paddingHorizontal: 2, paddingTop: 4 },
    hint: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, lineHeight: 16 },
  });
}
