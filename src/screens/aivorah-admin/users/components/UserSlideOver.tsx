import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { SelectField } from '../../shared/SelectField';
import { useAdminSchools } from '../../shared/useAdminSchools';
import { updateAdminUser, blockAdminUser, unblockAdminUser, sendPasswordReset, createAdminUser } from '../services/usersService';
import { AcademicFields, type AcademicValue } from './AcademicFields';
import type { AdminUser } from '../types';

export const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'school_admin', label: 'School Admin' },
];
export const roleLabel = (r: string) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r;

const BLOCK_REASONS = ['Policy violation', 'Unpaid / contract ended', 'Security concern', 'Requested by school'];
const NO_SCHOOL = '__b2c__';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SlideOverMode = { type: 'edit' | 'block'; user: AdminUser } | { type: 'add' } | null;

export function UserSlideOver({ mode, onClose, onDone }: { mode: SlideOverMode; onClose: () => void; onDone: (message: string) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  if (!mode) return null;
  return <SlidePanel mode={mode} s={s} colors={colors} onClose={onClose} onDone={onDone} />;
}

const PANEL_WIDTH = 440;

function SlidePanel({ mode, s, colors, onClose, onDone }: { mode: NonNullable<SlideOverMode>; s: any; colors: AppColors; onClose: () => void; onDone: (m: string) => void }) {
  const [progress] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [progress, nativeDriver]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver })
      .start(() => onClose());
  }, [progress, nativeDriver, onClose]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [PANEL_WIDTH, 0] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={s.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, s.scrim, { opacity: progress }]} />
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} testID="users-panel-backdrop" />
        <Animated.View style={[s.panel, { transform: [{ translateX }] }]}>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={close}
            testID="users-panel-close"
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={18} color={colors.textMain} />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={s.panelBody}>
            {mode.type === 'add'
              ? <AddBody s={s} colors={colors} onClose={close} onDone={onDone} />
              : mode.type === 'edit'
              ? <EditBody user={mode.user} s={s} colors={colors} onClose={close} onDone={onDone} />
              : <BlockBody user={mode.user} s={s} colors={colors} onClose={close} onDone={onDone} />}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function EditBody({ user, s, colors, onClose, onDone }: { user: AdminUser; s: any; colors: AppColors; onClose: () => void; onDone: (m: string) => void }) {
  const schools = useAdminSchools();
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(String(user.role));
  const [school, setSchool] = useState(user.school || NO_SCHOOL);
  const [acad, setAcad] = useState<AcademicValue>({ curriculum: user.curriculum || '', grade: user.grade || '', section: user.section || '' });
  const [confirmRole, setConfirmRole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const roleChanged = role !== user.role;
  const schoolOptions = [
    ...schools.schools.map((sc) => ({ value: sc.name, label: sc.name })),
    ...(user.school && !schools.schools.some((sc) => sc.name === user.school) ? [{ value: user.school, label: user.school }] : []),
    { value: NO_SCHOOL, label: 'Direct (B2C) — no school' },
  ];

  const isStudent = role === 'student';
  const schoolId = schools.schools.find((sc) => sc.name === school)?.id ?? null;

  async function save() {
    if (isStudent && roleChanged && (!acad.curriculum || !acad.grade)) { setError('Choose a curriculum and grade for this student.'); return; }
    if (roleChanged && !confirmRole) { setConfirmRole(true); return; }
    setBusy(true); setError('');
    try {
      const nextSchool = school === NO_SCHOOL ? null : school;
      const { changed } = await updateAdminUser(user.id, {
        name: name.trim() !== user.name ? name.trim() : undefined,
        role: roleChanged ? role : undefined,
        school: nextSchool !== (user.school || null) ? nextSchool : undefined,
        ...(isStudent ? {
          curriculum: acad.curriculum !== (user.curriculum || '') ? acad.curriculum : undefined,
          grade: acad.grade !== (user.grade || '') ? acad.grade : undefined,
          section: acad.section.trim() !== (user.section || '') ? acad.section.trim() || null : undefined,
        } : {}),
      });
      onDone(changed.length ? `${name.trim() || user.name} updated — they've been notified.` : 'No changes to save.');
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setResetMsg('Sending…');
    try {
      await sendPasswordReset(user.id);
      setResetMsg(`Reset link sent to ${user.email}.`);
    } catch (e: any) {
      setResetMsg(e?.message || 'Could not send the reset link.');
    }
  }

  return (
    <>
      <View>
        <Text style={[s.eyebrow, { color: colors.accentYellow }]}>EDIT USER</Text>
        <Text style={s.title}>{user.name || user.email}</Text>
      </View>
      <View style={s.field}>
        <Text style={s.label}>FULL NAME</Text>
        <TextInput testID="users-edit-name" style={s.input} value={name} onChangeText={setName} placeholderTextColor={colors.textDim} />
      </View>
      <View style={s.field}>
        <Text style={s.label}>EMAIL</Text>
        <TextInput style={[s.input, s.inputReadOnly]} value={user.email} editable={false} />
        <Text style={s.hint}>Email is the user’s login. They change it themselves from Settings → Change email, which moves their data with it.</Text>
      </View>
      <SelectField testID="users-edit-role" label="Role" value={role} options={ROLE_OPTIONS} onChange={(v) => { setRole(v); setConfirmRole(false); }} minWidth={0} />
      <SelectField testID="users-edit-school" label="School" placeholder={schools.placeholder} value={school} options={schoolOptions} onChange={setSchool} minWidth={0} />
      {isStudent && <AcademicFields schoolId={schoolId} value={acad} onChange={setAcad} s={s} colors={colors} />}
      <TouchableOpacity testID="users-edit-reset" style={s.resetBtn} onPress={reset} disabled={resetMsg === 'Sending…'}>
        <Feather name="mail" size={14} color={colors.textMain} />
        <Text style={s.resetBtnText}>Send password reset link</Text>
      </TouchableOpacity>
      {!!resetMsg && <Text style={s.hint} testID="users-edit-reset-msg">{resetMsg}</Text>}

      {confirmRole && (
        <View style={[s.confirm, { borderColor: colors.accentYellow }]} testID="users-edit-role-confirm">
          <Text style={s.confirmText}>
            Change role from {roleLabel(String(user.role))} to {roleLabel(role)}? They’ll see a different app the next time they sign in. Press Save again to confirm.
          </Text>
        </View>
      )}
      {!!error && <Text style={s.error} testID="users-edit-error">{error}</Text>}

      <View style={s.actions}>
        <TouchableOpacity testID="users-edit-save" style={[s.primaryBtn, { backgroundColor: colors.accentYellow }]} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.cardDark} /> : <Text style={[s.primaryBtnText, { color: colors.cardDark }]}>{confirmRole ? 'Confirm & save' : 'Save changes'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
      </View>
    </>
  );
}

function AddBody({ s, colors, onClose, onDone }: { s: any; colors: AppColors; onClose: () => void; onDone: (m: string) => void }) {
  const schools = useAdminSchools();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [school, setSchool] = useState(NO_SCHOOL);
  const [acad, setAcad] = useState<AcademicValue>({ curriculum: '', grade: '', section: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isStudent = role === 'student';
  const schoolId = schools.schools.find((sc) => sc.name === school)?.id ?? null;
  const schoolOptions = [
    ...schools.schools.map((sc) => ({ value: sc.name, label: sc.name })),
    ...(role === 'school_admin' ? [] : [{ value: NO_SCHOOL, label: 'Direct (B2C) — no school' }]),
  ];

  async function create() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim()) return setError('Enter the full name.');
    if (!EMAIL_RE.test(trimmedEmail)) return setError('Enter a valid email address.');
    if (role === 'school_admin' && (!school || school === NO_SCHOOL)) return setError('Choose the school this admin manages.');
    if (isStudent && (!acad.curriculum || !acad.grade)) return setError('Choose a curriculum and grade for this student.');
    setBusy(true); setError('');
    try {
      const { inviteSent, inviteError, verificationSent } = await createAdminUser({
        name: name.trim(), email: trimmedEmail, role,
        school: school && school !== NO_SCHOOL ? school : null,
        ...(isStudent ? { curriculum: acad.curriculum, grade: acad.grade, section: acad.section.trim() || null } : {}),
        frontendOrigin: typeof window !== 'undefined' && window.location ? window.location.origin : undefined,
      });
      if (inviteSent === false) return onDone(inviteError || `Account created for ${trimmedEmail}, but the invite email could not be sent. Use "Send password reset" to retry.`);
      onDone(`Invitation sent to ${trimmedEmail}. They'll set a password and verify their email before signing in.${verificationSent ? '' : ' (The verification email will follow on their first sign-in.)'}`);
    } catch (e: any) {
      setError(e?.message || 'Could not create this account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View>
        <Text style={[s.eyebrow, { color: colors.accentYellow }]}>ADD USER</Text>
        <Text style={s.title}>Invite a new user</Text>
      </View>
      <Text style={s.hint}>They’ll receive an email to set their password, then verify their email address before they can use Aivorah.</Text>
      <View style={s.field}>
        <Text style={s.label}>FULL NAME</Text>
        <TextInput testID="users-add-name" style={s.input} value={name} onChangeText={setName} placeholder="e.g. Riya Shah" placeholderTextColor={colors.textDim} />
      </View>
      <View style={s.field}>
        <Text style={s.label}>EMAIL</Text>
        <TextInput testID="users-add-email" style={s.input} value={email} onChangeText={setEmail} placeholder="name@example.com"
          placeholderTextColor={colors.textDim} autoCapitalize="none" keyboardType="email-address" />
      </View>
      <SelectField testID="users-add-role" label="Role" value={role} options={ROLE_OPTIONS}
        onChange={(v) => { setRole(v); if (v === 'school_admin' && school === NO_SCHOOL) setSchool(''); }} minWidth={0} />
      <SelectField testID="users-add-school" label={role === 'school_admin' ? 'School' : 'School (optional)'} placeholder={schools.placeholder}
        value={school} options={schoolOptions} onChange={setSchool} minWidth={0} />
      {isStudent && <AcademicFields schoolId={schoolId} value={acad} onChange={setAcad} s={s} colors={colors} />}
      {!!error && <Text style={s.error} testID="users-add-error">{error}</Text>}
      <View style={s.actions}>
        <TouchableOpacity testID="users-add-submit" style={[s.primaryBtn, { backgroundColor: colors.accentYellow }]} onPress={create} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.cardDark} /> : <Text style={[s.primaryBtnText, { color: colors.cardDark }]}>Send invitation</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
      </View>
    </>
  );
}

function BlockBody({ user, s, colors, onClose, onDone }: { user: AdminUser; s: any; colors: AppColors; onClose: () => void; onDone: (m: string) => void }) {
  const blocking = user.status !== 'blocked';
  const [reason, setReason] = useState(BLOCK_REASONS[0]);
  const [signOut, setSignOut] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tone = blocking ? colors.accentRed : (colors.primary || colors.accentGreen);

  async function confirm() {
    setBusy(true); setError('');
    try {
      if (blocking) await blockAdminUser(user.id, reason, signOut); else await unblockAdminUser(user.id);
      onDone(`${user.name || user.email} ${blocking ? 'blocked' : 'unblocked'}.`);
    } catch (e: any) {
      setError(e?.message || 'Could not update this user.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View>
        <Text style={[s.eyebrow, { color: tone }]}>{blocking ? 'BLOCK ACCOUNT' : 'RESTORE ACCESS'}</Text>
        <Text style={s.title}>{blocking ? 'Block' : 'Unblock'} {user.name || user.email}?</Text>
      </View>
      <Text style={s.body}>
        {blocking
          ? 'They will be signed out and unable to log in. Their data and progress are kept, and you can unblock them at any time.'
          : 'They will be able to sign in again immediately.'}
      </Text>
      {blocking && (
        <>
          <SelectField testID="users-block-reason" label="Reason" value={reason} options={BLOCK_REASONS} onChange={setReason} minWidth={0} />
          <TouchableOpacity testID="users-block-signout" style={s.checkRow} onPress={() => setSignOut((v) => !v)}>
            <View style={[s.check, signOut && { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow }]}>
              {signOut && <Feather name="check" size={12} color={colors.cardDark} />}
            </View>
            <Text style={s.checkText}>Sign out of all devices immediately</Text>
          </TouchableOpacity>
        </>
      )}
      {!!error && <Text style={s.error} testID="users-block-error">{error}</Text>}
      <View style={s.actions}>
        <TouchableOpacity testID="users-block-confirm" style={[s.primaryBtn, { backgroundColor: tone }]} onPress={confirm} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.cardDark} /> : <Text style={[s.primaryBtnText, { color: colors.cardDark }]}>{blocking ? 'Block user' : 'Unblock user'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
      </View>
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, flexDirection: 'row' },
    scrim: { backgroundColor: 'rgba(0,0,0,0.5)' },
    panel: { width: '100%', maxWidth: PANEL_WIDTH, height: '100%', backgroundColor: c.cardDark, borderLeftWidth: 1, borderLeftColor: c.borderColor },
    closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 2, width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark, alignItems: 'center', justifyContent: 'center' },
    panelBody: { padding: 28, gap: 18, flexGrow: 1 },
    eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: c.textMain, marginTop: 4 },
    body: { fontSize: 14, lineHeight: 21, color: c.textMuted },
    field: { gap: 6 },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: c.textMuted },
    input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, backgroundColor: c.cardDark, paddingHorizontal: 12, fontSize: 14, color: c.textMain },
    inputReadOnly: { backgroundColor: c.bgDark, color: c.textMuted },
    hint: { fontSize: 12, color: c.textDim, lineHeight: 17 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, paddingHorizontal: 14 },
    resetBtnText: { fontSize: 13.5, fontWeight: '700', color: c.textMain },
    confirm: { borderWidth: 1, borderRadius: 12, padding: 12 },
    confirmText: { fontSize: 13, color: c.textMain, lineHeight: 19 },
    error: { fontSize: 13, color: c.accentRed },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    check: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: c.textDim, alignItems: 'center', justifyContent: 'center' },
    checkText: { fontSize: 13.5, color: c.textMain },
    actions: { flexDirection: 'row', gap: 10, marginTop: 'auto' as any, paddingTop: 8 },
    primaryBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontSize: 14, fontWeight: '700' },
    cancelBtn: { height: 48, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: c.borderColor, justifyContent: 'center' },
    cancelText: { fontSize: 14, fontWeight: '700', color: c.textMain },
  });
}
