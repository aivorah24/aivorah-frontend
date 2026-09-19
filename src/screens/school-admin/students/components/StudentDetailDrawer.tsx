import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { StudentDetail, StudentEditPatch } from '../services/schoolAdminStudentsService';
import { formatJoined, formatLastActive } from '../utils/studentFormatters';
import { DetailRow } from './DetailRow';
import { STATUS_LABEL } from '../constants';

// ── Quick-inspect drawer (view · edit · delete) ─────────────────────────────
// Ported verbatim from SchoolAdminStudentsScreen.tsx (Phase 6 extraction) —
// behavior, props, and rendered output are unchanged.
export function StudentDetailDrawer({ visible, loading, detail, colors, onClose, onChangeStatus, onSave, onDelete }: {
  visible: boolean; loading: boolean; detail: StudentDetail | null; colors: AppColors;
  onClose: () => void; onChangeStatus: (s: 'active' | 'inactive' | 'archived') => void;
  onSave: (patch: StudentEditPatch) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  // Editable field buffers.
  const [fName, setFName] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [fSection, setFSection] = useState('');
  const [fAdm, setFAdm] = useState('');
  const [fParentName, setFParentName] = useState('');
  const [fParentPhone, setFParentPhone] = useState('');

  // Reset to view mode + reseed buffers whenever a different student opens.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets edit form on the selected student changing, external sync
    setMode('view');
    setErr('');
    if (detail) {
      setFName(detail.name || '');
      setFGrade(detail.grade || '');
      setFSection(detail.section || '');
      setFAdm(detail.admissionNumber || '');
      setFParentName(detail.parent?.name || '');
      setFParentPhone(detail.parent?.phone || '');
    }
  }, [detail?.id]);

  async function handleSave() {
    if (!detail) return;
    setErr('');
    setSaving(true);
    const patch: StudentEditPatch = {
      name: fName.trim(),
      grade: fGrade.trim(),
      section: fSection.trim(),
      admissionNumber: fAdm.trim(),
    };
    // Only send parent fields when a parent is actually linked (the server
    // applies them to that account; with no parent there's nothing to update).
    if (detail.parent) {
      patch.parentName = fParentName.trim();
      patch.parentPhone = fParentPhone.trim();
    }
    const error = await onSave(patch);
    setSaving(false);
    if (error) { setErr(error); return; }
    setMode('view');
  }

  async function handleDelete() {
    setErr('');
    setDeleting(true);
    const error = await onDelete();
    setDeleting(false);
    // Stay in confirmDelete mode on failure (mirrors handleSave's edit-mode
    // behavior) so the error text below actually renders — switching to
    // view mode here previously discarded the error silently.
    if (error) { setErr(error); return; }
    // On success the parent closes the drawer; nothing else to do here.
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerCard}>
          {loading || !detail ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginVertical: 40 }} />
          ) : (
            <>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle} numberOfLines={1}>
                  {mode === 'edit' ? 'Edit Student' : mode === 'confirmDelete' ? 'Delete Student' : detail.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {mode === 'view' && (
                    <TouchableOpacity onPress={() => { setErr(''); setMode('edit'); }} accessibilityRole="button" accessibilityLabel="Edit student">
                      <Feather name="edit-2" size={16} color={colors.textHeading} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                    <Feather name="x" size={18} color={colors.textDim} />
                  </TouchableOpacity>
                </View>
              </View>

              {mode === 'confirmDelete' ? (
                // ── Delete confirmation ──────────────────────────────────
                <View>
                  <Text style={styles.formHint}>
                    This permanently deletes <Text style={{ fontWeight: '700', color: colors.textHeading }}>{detail.name}</Text>&apos;s
                    account and all of their data (progress, assignments, login). This cannot be undone.
                    {'\n\n'}The linked parent account is not deleted. If you only want to hide this student, use Archive instead.
                  </Text>
                  {!!err && <Text style={styles.formError}>{err}</Text>}
                  <View style={styles.formFooter}>
                    <TouchableOpacity style={styles.formCancelBtn} onPress={() => setMode('view')} disabled={deleting}>
                      <Text style={styles.formCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDelete} disabled={deleting}>
                      {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.deleteConfirmText}>Delete permanently</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : mode === 'edit' ? (
                // ── Edit form ────────────────────────────────────────────
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                  <Text style={styles.formSection}>Account</Text>
                  <DetailRow label="Login email" value={detail.email} colors={colors} />
                  <Text style={styles.formHint}>Login email can&apos;t be changed here.</Text>

                  <Text style={styles.formLabel}>Student name</Text>
                  <TextInput style={styles.formInput} value={fName} onChangeText={setFName} placeholder="Full name" placeholderTextColor={colors.textDim} />

                  <Text style={styles.formSection}>Academic</Text>
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Grade</Text>
                      <TextInput style={styles.formInput} value={fGrade} onChangeText={setFGrade} placeholder="Grade 3" placeholderTextColor={colors.textDim} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Section</Text>
                      <TextInput style={styles.formInput} value={fSection} onChangeText={setFSection} placeholder="A" placeholderTextColor={colors.textDim} />
                    </View>
                  </View>
                  <Text style={styles.formLabel}>Admission #</Text>
                  <TextInput style={styles.formInput} value={fAdm} onChangeText={setFAdm} placeholder="TSRA-1001" placeholderTextColor={colors.textDim} autoCapitalize="characters" />

                  <Text style={styles.formSection}>Parent / Guardian</Text>
                  {detail.parent ? (
                    <>
                      <DetailRow label="Email" value={detail.parent.email} colors={colors} />
                      <Text style={styles.formLabel}>Parent name</Text>
                      <TextInput style={styles.formInput} value={fParentName} onChangeText={setFParentName} placeholder="Parent name" placeholderTextColor={colors.textDim} />
                      <Text style={styles.formLabel}>Parent phone</Text>
                      <TextInput style={styles.formInput} value={fParentPhone} onChangeText={setFParentPhone} placeholder="+91 90000 00000" placeholderTextColor={colors.textDim} keyboardType="phone-pad" />
                    </>
                  ) : (
                    <Text style={styles.formHint}>No parent account linked yet.</Text>
                  )}

                  {!!err && <Text style={styles.formError}>{err}</Text>}
                  <View style={styles.formFooter}>
                    <TouchableOpacity style={styles.formCancelBtn} onPress={() => { setErr(''); setMode('view'); }} disabled={saving}>
                      <Text style={styles.formCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formSubmitBtn} onPress={handleSave} disabled={saving}>
                      {saving ? <ActivityIndicator color="#0B0B0B" size="small" /> : <Text style={styles.formSubmitText}>Save changes</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                // ── View mode ────────────────────────────────────────────
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                  <Text style={styles.formSection}>Account</Text>
                  <DetailRow label="Login email" value={detail.email} colors={colors} />
                  <DetailRow label="Status" value={STATUS_LABEL[detail.status]} colors={colors} />
                  <DetailRow label="Last active" value={formatLastActive(detail.lastActiveAt)} colors={colors} />

                  <Text style={styles.formSection}>Academic</Text>
                  <DetailRow label="Grade" value={detail.grade || '—'} colors={colors} />
                  <DetailRow label="Section" value={detail.section || '—'} colors={colors} />
                  <DetailRow label="Admission #" value={detail.admissionNumber || '—'} colors={colors} />
                  <DetailRow label="Joined" value={formatJoined(detail.joinedAt)} colors={colors} />

                  <Text style={styles.formSection}>Parent / Guardian</Text>
                  {detail.parent ? (
                    <>
                      <DetailRow label="Name" value={detail.parent.name} colors={colors} />
                      <DetailRow label="Email" value={detail.parent.email} colors={colors} />
                      {!!detail.parent.phone && <DetailRow label="Phone" value={detail.parent.phone} colors={colors} />}
                    </>
                  ) : (
                    <Text style={styles.formHint}>No parent account linked yet.</Text>
                  )}

                  <Text style={styles.formSection}>Quick Actions</Text>
                  <View style={styles.drawerActions}>
                    {detail.status !== 'active' && (
                      <TouchableOpacity style={styles.bulkBtn} onPress={() => onChangeStatus('active')}>
                        <Text style={styles.bulkBtnText}>Mark Active</Text>
                      </TouchableOpacity>
                    )}
                    {detail.status !== 'inactive' && (
                      <TouchableOpacity style={styles.bulkBtn} onPress={() => onChangeStatus('inactive')}>
                        <Text style={styles.bulkBtnText}>Mark Inactive</Text>
                      </TouchableOpacity>
                    )}
                    {detail.status !== 'archived' && (
                      <TouchableOpacity style={styles.bulkBtnDanger} onPress={() => onChangeStatus('archived')}>
                        <Text style={styles.bulkBtnDangerText}>Archive</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={[styles.formSection, { color: colors.accentRed }]}>Danger Zone</Text>
                  <TouchableOpacity style={styles.deleteRowBtn} onPress={() => { setErr(''); setMode('confirmDelete'); }} accessibilityRole="button">
                    <Feather name="trash-2" size={14} color={colors.accentRed} />
                    <Text style={styles.deleteRowText}>Delete this student permanently</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    drawerCard: { backgroundColor: colors.cardDark, borderRadius: 20, borderWidth: 1, borderColor: colors.borderColor, padding: 24, width: '100%', maxWidth: 420 },
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    formTitle: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '700', color: colors.textHeading, flexShrink: 1 },
    formSection: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textDim, marginTop: 16, marginBottom: 8 },
    formRow: { flexDirection: 'row', gap: 12 },
    formLabel: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '600', color: colors.textMuted, marginBottom: 5, marginTop: 8 },
    formInput: {
      fontFamily: fonts.serif, fontSize: 13, color: colors.textMain,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm,
      paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.bgDark,
    },
    formHint: { fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 6, lineHeight: 16 },
    formError: { fontFamily: fonts.serif, fontSize: 12, color: colors.accentRed, marginTop: 12 },
    formFooter: { flexDirection: 'row', gap: 10, marginTop: 18 },
    formCancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    formCancelText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textMuted },
    formSubmitBtn: { flex: 1, backgroundColor: colors.accentYellow, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    formSubmitText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },

    drawerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    bulkBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark },
    bulkBtnText: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '700', color: colors.textMuted },
    bulkBtnDanger: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: `${colors.accentRed}55`, backgroundColor: `${colors.accentRed}14` },
    bulkBtnDangerText: { fontFamily: fonts.serif, fontSize: 11.5, fontWeight: '700', color: colors.accentRed },

    deleteRowBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
      borderWidth: 1, borderColor: `${colors.accentRed}55`, backgroundColor: `${colors.accentRed}0F`,
      borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 9, marginTop: 2,
    },
    deleteRowText: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentRed },
    deleteConfirmBtn: { flex: 1, backgroundColor: colors.accentRed, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
    deleteConfirmText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#fff' },
  });
}
