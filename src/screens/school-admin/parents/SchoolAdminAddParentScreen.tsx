import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Platform, Share, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { spacing, radius, fonts } from '../../../theme';
import type { AppColors } from '../../../theme';
import { useAddParentState } from './hooks/useAddParentState';
import ChildLinkEditor from './components/ChildLinkEditor';
import FormSubmitError from '../shared/FormSubmitError';

export default function SchoolAdminAddParentScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const {
    firstName, setFirstName, lastName, setLastName, parentEmail, setParentEmail, phone, setPhone, children,
    submitting, formError, unresolved, result,
    existingParent, canLinkExisting, linking, linkResult, linkToExisting,
    sectionsByGrade, allSections, schoolCurriculumBase, openDropdown, setOpenDropdown,
    canSubmit, updateChild, addChild, removeChild, submit, reset,
  } = useAddParentState(user?.email);

  // React Navigation reuses this screen instance rather than remounting it —
  // without this, tapping "Add Parent" again after a successful create kept
  // showing the PREVIOUS parent's success screen with their real password.
  useFocusEffect(useCallback(() => { reset(); }, [reset]));

  async function shareCredentials() {
    if (!result) return;
    const message = `${result.name}'s Aivorah login:\nEmail: ${result.email}\nPassword: ${result.password}`;
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        try { await nav.share({ text: message }); return; } catch { /* cancelled or unsupported */ }
      }
      if (nav?.clipboard) nav.clipboard.writeText(message).catch(() => {});
      Alert.alert('Copied', 'Sharing is not available in this browser — the login details were copied instead, so you can paste them anywhere.');
      return;
    }
    try { await Share.share({ message }); } catch { /* cancelled */ }
  }

  function goToParents() { navigation?.navigate?.('SchoolAdminParents'); }

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Add Parent"
          subtitle="Create a parent/guardian account and link them to their child."
          onMenuPress={() => navigation?.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {linkResult ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}><Feather name="check" size={20} color="#0B0B0B" /></View>
                <Text style={styles.summaryTitle}>Linked to {linkResult.name}</Text>
                <Text style={styles.summaryHint}>
                  {linkResult.linked > 0
                    ? `The child now appears on ${linkResult.email}'s account. Their existing login is unchanged.`
                    : `The child was already linked to ${linkResult.email}.`}
                </Text>
              </View>
              <View style={[styles.footerRow, { justifyContent: 'center' }]}>
                <TouchableOpacity style={styles.primaryBtn} onPress={goToParents} accessibilityRole="button">
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : result ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}><Feather name="check" size={20} color="#0B0B0B" /></View>
                <Text style={styles.summaryTitle}>Parent added</Text>
                <Text style={styles.warnText}>Save these now — the password won&apos;t be shown again.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Login credentials</Text>
                <View style={styles.credBlock}>
                  <View style={styles.credRow}><Text style={styles.credLabel}>Name</Text><Text style={styles.credValue}>{result.name}</Text></View>
                  <View style={styles.credRow}><Text style={styles.credLabel}>Login email</Text><Text style={styles.credValue} selectable>{result.email}</Text></View>
                  <View style={styles.credRow}><Text style={styles.credLabel}>Password</Text><Text style={styles.credValueMono} selectable>{result.password}</Text></View>
                </View>
                <TouchableOpacity style={styles.shareBtn} onPress={shareCredentials} activeOpacity={0.8} accessibilityRole="button">
                  <Feather name="share-2" size={14} color={colors.accentYellow} />
                  <Text style={styles.shareBtnText}>Share Login Details</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.footerRow, { justifyContent: 'center' }]}>
                <TouchableOpacity style={styles.primaryBtn} onPress={goToParents} accessibilityRole="button">
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Basic Information</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>First name *</Text>
                    <TextInput value={firstName} onChangeText={setFirstName} style={styles.textInput} placeholder="e.g. Reddy" placeholderTextColor={colors.textDim} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Last name *</Text>
                    <TextInput value={lastName} onChangeText={setLastName} style={styles.textInput} placeholder="e.g. Emandi" placeholderTextColor={colors.textDim} />
                  </View>
                </View>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  value={parentEmail} onChangeText={setParentEmail} style={styles.textInput}
                  placeholder="Optional — a login ID is generated if left blank" placeholderTextColor={colors.textDim}
                  autoCapitalize="none" keyboardType="email-address"
                />
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  value={phone} onChangeText={setPhone} style={styles.textInput}
                  placeholder="Optional — for contact" placeholderTextColor={colors.textDim}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[styles.card, openDropdown && { zIndex: 30 }]}>
                <Text style={styles.cardTitle}>Link to Child</Text>
                <Text style={styles.cardHint}>
                  Enter the student&apos;s Admission No (fastest, exact match) — or their Name, Grade, and Section.
                  We&apos;ll match this to their existing record in your school. A parent can be linked to more than one child.
                </Text>
                <ChildLinkEditor
                  childEntries={children} onUpdate={updateChild} onAdd={addChild} onRemove={removeChild}
                  unresolved={unresolved} sectionsByGrade={sectionsByGrade} allSections={allSections}
                  schoolCurriculumBase={schoolCurriculumBase} colors={colors}
                  openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
                />
              </View>

              <FormSubmitError
                message={formError}
                colors={colors}
                action={canLinkExisting && existingParent
                  ? { label: `Link to ${existingParent.name || existingParent.email}`, onPress: linkToExisting, busy: linking }
                  : undefined}
              />

              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={goToParents} accessibilityRole="button" disabled={submitting || linking}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, (!canSubmit || submitting || linking) && styles.primaryBtnDisabled]}
                  onPress={submit}
                  disabled={!canSubmit || submitting || linking}
                  accessibilityRole="button"
                >
                  {submitting ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.primaryBtnText}>Create Parent</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    content: { padding: spacing.xl, paddingBottom: 60, width: '100%', maxWidth: 720, alignSelf: 'center' },
    card: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
    cardTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: colors.textHeading, marginBottom: 4 },
    cardHint: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, lineHeight: 16, marginBottom: 12 },
    formRow: { flexDirection: 'row', gap: 14 },
    formLabel: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 10 },
    textInput: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.bgDark },
    footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingHorizontal: 18, height: 42 },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingHorizontal: 16, height: 42 },
    secondaryBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    summaryCard: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
    summaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    summaryTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700', color: colors.textHeading, marginBottom: 6 },
    summaryHint: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    warnText: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentYellow, textAlign: 'center' },
    credBlock: { marginTop: 6 },
    credRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    credLabel: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim },
    credValue: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.textHeading },
    credValueMono: { fontFamily: Platform.select({ web: 'monospace', default: fonts.serif }), fontSize: 12, fontWeight: '700', color: colors.textHeading },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', gap: 6, backgroundColor: `${colors.accentYellow}18`, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginTop: 14 },
    shareBtnText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.accentYellow },
  });
}
