/**
 * OnboardingParentBoxes.tsx
 * Parent onboarding — all sections shown as cards on a single page
 * (Personal Info, Your Child(ren), Child's Learning Profile, Child's
 * Account, Your Avatar). Everything is visible and editable at once;
 * "Complete Setup" saves the profile, links/creates child accounts, and
 * finishes onboarding. Screen-level orchestration only - form state lives
 * in hooks/, network calls in services/, sections in components/.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth, getPendingReturnRole } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { computeParentCompletion } from './utils/parentCompletion';
import { PhoneOtpModal } from '../../onboarding/phoneOtpVerification';

import { usePersonalInfo } from './hooks/usePersonalInfo';
import { useChildrenForm } from './hooks/useChildrenForm';
import { useChildEmailOtp } from './hooks/useChildEmailOtp';
import { useOnboardingSubmit } from './hooks/useOnboardingSubmit';

import { PersonalInfoCard } from './components/PersonalInfoCard';
import { ChildrenCard } from './components/ChildrenCard';
import { LearningProfileCard } from './components/LearningProfileCard';
import { ChildAccountCard } from './components/ChildAccountCard';
import { AvatarCard } from './components/AvatarCard';
import { ChildCredentialsModal } from './components/ChildCredentialsModal';
import { LeaveConfirmModal } from './components/LeaveConfirmModal';

const TEAL = '#5F8A86';

export default function OnboardingParentBoxes() {
  const { logout, cancelAddParentProfile } = useAuth();
  // Teacher adding a parent profile → Back returns to the teacher dashboard
  // (no sign-out, nothing persisted), instead of the "leave home" sign-out modal.
  const isAddingParent = getPendingReturnRole() === 'teacher';
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const personal = usePersonalInfo();
  const childrenForm = useChildrenForm();
  const otp = useChildEmailOtp(childrenForm.activeChild, childrenForm.activeChildIdx, childrenForm.setChildren, childrenForm.updateChild);

  // Web: trap the browser Back button for the whole parent onboarding flow (#171 —
  // previously only trapped while a teacher adds a parent profile, so a normal new
  // parent signup pressing browser Back would silently navigate away with no
  // confirmation). Mirrors the in-page back/close button's logic at the "Return to
  // home page?" confirm below: teacher-adding-parent cancels cleanly, anyone else
  // gets the explicit leave-confirm dialog instead of an unannounced exit.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveConfirm(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Per-card completion ────────────────────────────
  // Adding children is OPTIONAL during onboarding (client feedback, 2026-06-13):
  // a parent may skip and add kids later from the dashboard. A child only has to
  // be completed if the parent actually started adding one (entered a name).
  const {
    personalDone, addingChildren, startedChildren, curriculumDone, accountDone, avatarDone, requiredDone, completionPct,
  } = computeParentCompletion({
    fullName: personal.fullName, city: personal.city, dob: personal.dob, mobile: personal.mobile,
    children: childrenForm.children, avatarStyle: personal.avatarStyle,
  });

  const submit = useOnboardingSubmit({
    fullName: personal.fullName, city: personal.city, dob: personal.dob, mobile: personal.mobile,
    mobileCode: personal.mobileCode, stateProv: personal.stateProv, country: personal.country,
    avatarStyle: personal.avatarStyle, children: childrenForm.children,
    mobileVerified: personal.mobileOtp.mobileVerified, verifiedMobile: personal.mobileOtp.verifiedMobile,
    requiredDone, addingChildren,
  });

  return (
    <View style={styles.screen}>
      <ChildCredentialsModal
        colors={colors} styles={styles} teal={TEAL}
        visible={submit.showChildCreds}
        onClose={submit.confirmChildCredsAndFinish}
        creds={submit.createdChildCreds}
        copiedField={submit.copiedField}
        onCopy={submit.copyToClipboard}
        onShare={submit.shareCredentials}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.topbar}>
          <View style={styles.logoRow}>
            <TouchableOpacity
              onPress={() => setShowLeaveConfirm(true)}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityLabel={isAddingParent ? 'Back to teacher dashboard' : 'Back to home page'}
            >
              <Feather name="arrow-left" size={18} color={colors.textMuted} />
              <Text style={styles.backTxt}>Back</Text>
            </TouchableOpacity>
            <View style={styles.logoMark}><Feather name="zap" size={14} color="#0B0B0B" /></View>
            <Text style={styles.logoTxt}>Aivorah</Text>
            <View style={[styles.roleBadge, styles.roleBadgeParent]}>
              <Text style={[styles.roleBadgeText, styles.roleBadgeTextParent]}>Parent</Text>
            </View>
          </View>
          <View style={styles.completionRow}>
            <Text style={styles.completionLbl}>Profile Completion</Text>
            <View style={styles.completionRing}>
              <Text style={styles.completionPct}>{completionPct}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.greetWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ backgroundColor: TEAL + '18', borderColor: TEAL + '40', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: TEAL, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Parent Onboarding</Text>
            </View>
          </View>
          <Text style={styles.greetMain}>Welcome — let&apos;s set up your family profile</Text>
          <Text style={styles.greetSub}>Fill in each section so we can connect you with your child&apos;s learning journey.</Text>
        </View>

        {/* ── Row 1: Personal Info / Your Child(ren) ── */}
        <View style={[styles.rowWrap, styles.rowWrapStretch, { zIndex: 20 }]}>
          <PersonalInfoCard
            colors={colors} styles={styles} teal={TEAL} done={personalDone}
            fullName={personal.fullName} setFullName={personal.setFullName}
            country={personal.country} setCountry={personal.setCountry}
            stateProv={personal.stateProv} setStateProv={personal.setStateProv}
            city={personal.city} setCity={personal.setCity}
            dob={personal.dob} setDob={personal.setDob}
            mobile={personal.mobile} mobileCode={personal.mobileCode}
            setMobileCode={personal.setMobileCode} onMobileChange={personal.onMobileChange}
            mobileOtp={personal.mobileOtp}
            locating={personal.locating} setLocating={personal.setLocating}
          />
          <ChildrenCard
            colors={colors} styles={styles} teal={TEAL}
            childrenList={childrenForm.children} activeChildIdx={childrenForm.activeChildIdx}
            activeChild={childrenForm.activeChild} selectChild={childrenForm.selectChild}
            removeChild={childrenForm.removeChild} updateChild={childrenForm.updateChild}
            addAnotherChild={childrenForm.addAnotherChild}
            schoolLocating={childrenForm.schoolLocating} setSchoolLocating={childrenForm.setSchoolLocating}
          />
        </View>

        {/* Sections 3 & 4 only appear once the parent starts adding a child
            (keeps onboarding clean for parents who skip the optional child step). */}
        {addingChildren && (<>
          <View style={styles.rowWrap}>
            <LearningProfileCard
              styles={styles} done={curriculumDone}
              childrenList={childrenForm.children} activeChildIdx={childrenForm.activeChildIdx}
              activeChild={childrenForm.activeChild} selectChild={childrenForm.selectChild}
              updateChild={childrenForm.updateChild}
            />
          </View>

          <View style={styles.rowWrap}>
            <ChildAccountCard
              colors={colors} styles={styles} teal={TEAL} done={accountDone}
              childrenList={childrenForm.children} activeChildIdx={childrenForm.activeChildIdx}
              activeChild={childrenForm.activeChild} selectChild={childrenForm.selectChild}
              updateChild={childrenForm.updateChild}
              showChildPassword={childrenForm.showChildPassword} setShowChildPassword={childrenForm.setShowChildPassword}
              otp={otp}
            />
          </View>
        </>)}

        {/* ── Row 4: Your Avatar ── */}
        <View style={styles.rowWrap}>
          <AvatarCard styles={styles} teal={TEAL} done={avatarDone} avatarStyle={personal.avatarStyle} setAvatarStyle={personal.setAvatarStyle} />
        </View>

        {submit.saveError ? <Text style={styles.errorTxt}>{submit.saveError}</Text> : null}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.secureRow}>
            <View style={styles.secureIcon}><Feather name="shield" size={14} color={TEAL} /></View>
            <Text style={styles.secureTxt}>Your data is secure and never shared.</Text>
          </View>
          <View style={styles.footerBtns}>
            {!requiredDone && (
              <Text style={styles.requiredHint}>{(() => {
                const missing: string[] = [];
                if (!personalDone) missing.push('Personal Info');
                // Child sections only matter once a child has been started.
                if (!curriculumDone) {
                  const who = startedChildren.filter((c) => !(c.curriculum.length > 0 && c.grade.length > 0)).map((c) => c.name.trim() || 'a child');
                  missing.push(`Learning Profile (curriculum & grade${who.length ? ' for ' + who.join(', ') : ''})`);
                }
                if (!accountDone) {
                  const who = startedChildren.filter((c) => {
                    const age = c.age ? parseInt(c.age, 10) : 0;
                    return age >= 14 ? !/^\S+@\S+\.\S+$/.test(c.linkEmail.trim()) : c.school.trim().length < 2;
                  }).map((c) => c.name.trim() || 'a child');
                  missing.push(`Child's Account${who.length ? ' for ' + who.join(', ') : ''}`);
                }
                return missing.length ? `Still needed: ${missing.join('; ')}` : 'Complete all sections above to continue';
              })()}</Text>
            )}
            {requiredDone && !addingChildren && (
              <Text style={styles.requiredHint}>Adding children is optional — you can add them anytime from your dashboard.</Text>
            )}
            <TouchableOpacity
              style={[styles.completeBtn, !requiredDone && { opacity: 0.4 }]}
              disabled={!requiredDone || submit.saving}
              onPress={() => submit.handleFinish(true)} activeOpacity={0.85}>
              <Text style={styles.completeTxt}>{submit.saving ? 'Saving...' : (addingChildren ? 'Complete Setup' : 'Skip for now & Finish')}</Text>
              {!submit.saving && <Feather name="arrow-right" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── Leave confirmation (home page, or back-to-teacher-dashboard when adding a parent profile) ── */}
      <LeaveConfirmModal
        styles={styles} teal={TEAL}
        visible={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        isAddingParent={isAddingParent}
        saving={submit.saving}
        onSaveAndGoBack={() => { setShowLeaveConfirm(false); submit.handleFinish(false); }}
        onDiscardAndGoBack={() => {
          setShowLeaveConfirm(false);
          if (isAddingParent) cancelAddParentProfile();
          else logout();
        }}
      />

      <PhoneOtpModal
        mobile={personal.mobile}
        mobileCode={personal.mobileCode}
        otpModalVisible={personal.mobileOtp.otpModalVisible}
        otpCode={personal.mobileOtp.otpCode}
        setOtpCode={personal.mobileOtp.setOtpCode}
        otpError={personal.mobileOtp.otpError}
        otpVerifying={personal.mobileOtp.otpVerifying}
        handleVerifyOtp={personal.mobileOtp.handleVerifyOtp}
        handleCancelOtp={personal.mobileOtp.handleCancelOtp}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

function useStyles(colors: any) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgDark },
    scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxWidth: 1280, width: '100%', alignSelf: 'center' },

    topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
      borderWidth: 1, borderColor: colors.borderColor, marginRight: 4,
    },
    backTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    confirmBox: {
      width: 360, maxWidth: '95%', borderRadius: 20, padding: 28, alignItems: 'center',
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
    },
    confirmIcon: {
      width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
      backgroundColor: TEAL + '22', marginBottom: 16,
    },
    confirmTitle: { fontSize: 19, fontWeight: '800', color: colors.textMain, marginBottom: 10, textAlign: 'center' },
    confirmBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
    confirmPrimary: { width: '100%', backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
    confirmPrimaryTxt: { fontSize: 15, fontWeight: '700', color: '#0B0B0B' },
    confirmSecondary: { width: '100%', paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor },
    confirmSecondaryTxt: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    logoMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
    logoTxt: { fontSize: 16, fontWeight: '800', color: colors.textMain },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 12,
      borderWidth: 1,
      alignSelf: 'center',
      marginLeft: 4,
    },
    roleBadgeParent: {
      backgroundColor: TEAL + '18',
      borderColor: TEAL + '40',
    },
    roleBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    roleBadgeTextParent: {
      color: TEAL,
    },
    completionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    completionLbl: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    completionRing: {
      width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: TEAL,
      alignItems: 'center', justifyContent: 'center',
    },
    completionPct: { fontSize: 11, fontWeight: '800', color: TEAL },

    greetWrap: { marginBottom: 24 },
    greetMain: { fontSize: 24, fontWeight: '800', color: colors.textMain },
    greetSub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

    rowWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 },
    rowWrapStretch: { alignItems: 'stretch' },
    card: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 16, padding: 20, gap: 16,
    },
    card3: { flexGrow: 1, flexBasis: 320, minWidth: 280 },
    cardFull: { flexGrow: 1, flexBasis: '100%', minWidth: 280 },

    cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    cardIcon: {
      width: 38, height: 38, borderRadius: 10, backgroundColor: TEAL + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },
    cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    cardCheck: {
      width: 18, height: 18, borderRadius: 9, backgroundColor: TEAL,
      alignItems: 'center', justifyContent: 'center',
    },

    fieldGroup: { gap: 8 },
    lbl: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    lblRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locateTxt: { fontSize: 11, fontWeight: '700', color: TEAL },
    input: {
      height: 44, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: colors.textMain,
    },
    dropdown: {
      marginTop: 6,
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 10, overflow: 'hidden',
    },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    dropdownTxt: { fontSize: 13, color: colors.textMain },

    phoneRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 6, alignItems: 'center', width: '100%', overflow: 'hidden' },
    phoneCode: {
      height: 44, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor,
      backgroundColor: colors.bgDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      flexShrink: 0,
    },
    phoneCodeTxt: { fontSize: 14, fontWeight: '700', color: colors.textMain },
    phoneInput: { flex: 1, flexBasis: 0, minWidth: 0, flexShrink: 1 },
    warnTxt: { color: '#ef4444', fontSize: 12, lineHeight: 17, marginTop: 4 },
    verifyBtn: {
      height: 44, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center',
      borderRadius: 10, borderWidth: 1, borderColor: TEAL, flexShrink: 0,
    },
    verifyBtnTxt: { fontSize: 12, fontWeight: '700', color: TEAL },
    verifiedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6, height: 44,
      paddingHorizontal: 12, justifyContent: 'center', flexShrink: 0,
      borderRadius: 10, borderWidth: 1, borderColor: TEAL + '40', backgroundColor: TEAL + '12',
    },
    verifiedTxt: { fontSize: 12, fontWeight: '700', color: TEAL },

    subHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    hintBox: { borderRadius: 10, padding: 12, borderWidth: 1 },
    hintBoxFill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    hintBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fillCenter: { flex: 1, justifyContent: 'center', gap: 12 },
    fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    fieldThird: { flexBasis: '30%', flexGrow: 1, minWidth: 240 },
    fieldHalf: { flexBasis: '46%', flexGrow: 1, minWidth: 240 },

    fieldBox: {
      backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 12, padding: 12,
    },
    gradeGroupsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    gradeGroup: {
      flexBasis: '23%', flexGrow: 1, minWidth: 220,
      backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: 12, padding: 12, gap: 10,
    },
    gradeGroupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    gradeGroupDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TEAL },
    gradeGroupLbl: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.textMain, textTransform: 'uppercase', letterSpacing: 0.5 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark },
    chipActive: { backgroundColor: TEAL + '20', borderColor: TEAL },
    chipTxt: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    chipTxtActive: { color: TEAL },

    addChildBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderWidth: 1, borderColor: TEAL + '40', borderRadius: 10,
      borderStyle: 'dashed', backgroundColor: TEAL + '08',
    },
    addChildTxt: { fontSize: 14, fontWeight: '600', color: TEAL },

    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    avatarTile: {
      flexBasis: '11%', flexGrow: 1, minWidth: 90, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark, position: 'relative',
    },
    avatarTileActive: { borderColor: TEAL, backgroundColor: TEAL + '10' },
    avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarLbl: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
    tileCheck: {
      position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8,
      backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
    },

    errorTxt: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 12 },

    footer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16, marginTop: 8,
    },
    secureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    secureIcon: {
      width: 28, height: 28, borderRadius: 8, backgroundColor: TEAL + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    secureTxt: { fontSize: 13, color: colors.textMuted },
    footerBtns: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    requiredHint: { fontSize: 12, color: colors.textMuted, maxWidth: 220, textAlign: 'right' },
    completeBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: TEAL, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12,
    },
    completeTxt: { fontSize: 14, fontWeight: '800', color: '#0B0B0B' },

    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    modalBox: {
      backgroundColor: colors.cardDark, borderRadius: 16, padding: 20, gap: 14,
      width: '100%', maxWidth: 440, borderWidth: 1, borderColor: colors.borderColor,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },
    modalText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    modalBtn: {
      backgroundColor: TEAL, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    },
    modalBtnText: { fontSize: 14, fontWeight: '800', color: '#0B0B0B' },
  });
}
