import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { SelectField } from '../../shared/SelectField';
import { useAdminSchools } from '../../shared/useAdminSchools';
import { updateAdminUser, blockAdminUser, unblockAdminUser, sendPasswordReset } from '../services/usersService';
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

export type SlideOverMode = { type: 'edit' | 'block'; user: AdminUser } | null;

export function UserSlideOver({ mode, onClose, onDone }: { mode: SlideOverMode; onClose: () => void; onDone: (message: string) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  if (!mode) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} testID="users-panel-backdrop" />
        <View style={s.panel}>
          <ScrollView contentContainerStyle={s.panelBody}>
            {mode.type === 'edit'
              ? <EditBody user={mode.user} s={s} colors={colors} onClose={onClose} onDone={onDone} />
              : <BlockBody user={mode.user} s={s} colors={colors} onClose={onClose} onDone={onDone} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EditBody({ user, s, colors, onClose, onDone }: { user: AdminUser; s: any; colors: AppColors; onClose: () => void; onDone: (m: string) => void }) {
  const schools = useAdminSchools();
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(String(user.role));
  const [school, setSchool] = useState(user.school || NO_SCHOOL);
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

  async function save() {
    if (roleChanged && !confirmRole) { setConfirmRole(true); return; }
    setBusy(true); setError('');
    try {
      const nextSchool = school === NO_SCHOOL ? null : school;
      const { changed } = await updateAdminUser(user.id, {
        name: name.trim() !== user.name ? name.trim() : undefined,
        role: roleChanged ? role : undefined,
        school: nextSchool !== (user.school || null) ? nextSchool : undefined,
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
        <Text style={s.hint}>Email is the user's login. They change it themselves from Settings → Change email, which moves their data with it.</Text>
      </View>
      <SelectField testID="users-edit-role" label="Role" value={role} options={ROLE_OPTIONS} onChange={(v) => { setRole(v); setConfirmRole(false); }} minWidth={0} />
      <SelectField testID="users-edit-school" label="School" placeholder={schools.placeholder} value={school} options={schoolOptions} onChange={setSchool} minWidth={0} />
      <TouchableOpacity testID="users-edit-reset" style={s.resetBtn} onPress={reset} disabled={resetMsg === 'Sending…'}>
        <Feather name="mail" size={14} color={colors.textMain} />
        <Text style={s.resetBtnText}>Send password reset link</Text>
      </TouchableOpacity>
      {!!resetMsg && <Text style={s.hint} testID="users-edit-reset-msg">{resetMsg}</Text>}

      {confirmRole && (
        <View style={[s.confirm, { borderColor: colors.accentYellow }]} testID="users-edit-role-confirm">
          <Text style={s.confirmText}>
            Change role from {roleLabel(String(user.role))} to {roleLabel(role)}? They'll see a different app the next time they sign in. Press Save again to confirm.
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
        <Text style={[s.eyebrow, { color: colors.accentRed }]}>{blocking ? 'BLOCK ACCOUNT' : 'RESTORE ACCESS'}</Text>
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
              {signOut && <Feather name="check" size={12} color="#FFFFFF" />}
            </View>
            <Text style={s.checkText}>Sign out of all devices immediately</Text>
          </TouchableOpacity>
        </>
      )}
      {!!error && <Text style={s.error} testID="users-block-error">{error}</Text>}
      <View style={s.actions}>
        <TouchableOpacity testID="users-block-confirm" style={[s.primaryBtn, { backgroundColor: tone }]} onPress={confirm} disabled={busy}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[s.primaryBtnText, { color: '#FFFFFF' }]}>{blocking ? 'Block user' : 'Unblock user'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
      </View>
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)' },
    panel: { width: '100%', maxWidth: 440, height: '100%', backgroundColor: c.cardDark, borderLeftWidth: 1, borderLeftColor: c.borderColor },
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
