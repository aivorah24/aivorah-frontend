/**
 * Import class timetables from a PDF: pick → read (preview) → review the
 * matched classes → save the ticked ones. Nothing is saved before "Save".
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { TimetableClass } from '../services/timetableApi';
import { useTimetableImport } from '../hooks/useTimetableImport';

export default function ImportTimetableModal({ visible, onClose, targets, onSaved }: {
  visible: boolean;
  onClose: () => void;
  targets: TimetableClass[];
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const imp = useTimetableImport(targets, onSaved);
  const [choosingFor, setChoosingFor] = useState<number | null>(null);

  const close = () => { imp.reset(); setChoosingFor(null); onClose(); };
  const busy = imp.step === 'reading' || imp.step === 'saving';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : close}>
      <View style={styles.overlay}>
        <View style={styles.card} testID="timetable-import-modal">
          <View style={styles.header}>
            <Text style={styles.title}>Import timetable PDF</Text>
            {!busy && (
              <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {imp.step === 'pick' && (
            <>
              <Text style={styles.note}>
                Upload a timetable PDF with one or more classes. We read each class&apos;s periods, days and subjects
                and match it to your classes. You check everything before anything is saved.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={imp.pickFile} accessibilityRole="button">
                <Feather name="upload" size={15} color="#fff" />
                <Text style={styles.primaryText}>Choose PDF</Text>
              </TouchableOpacity>
            </>
          )}

          {imp.step === 'reading' && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accentYellow} />
              <Text style={styles.note}>Reading {imp.fileName}… this can take up to a minute.</Text>
            </View>
          )}

          {(imp.step === 'review' || imp.step === 'saving') && (
            <>
              <Text style={styles.note}>
                Found {imp.rows.length} {imp.rows.length === 1 ? 'class' : 'classes'} in {imp.fileName}. Saving replaces the periods
                and subjects of the ticked classes.
              </Text>
              <ScrollView style={{ maxHeight: 380 }}>
                {imp.rows.map((row, i) => {
                  const teaching = row.periodDefs.filter((p) => !p.isBreak).length;
                  return (
                    <View key={`${row.label}-${i}`} style={styles.row}>
                      <TouchableOpacity
                        onPress={() => imp.toggle(i)}
                        disabled={!row.target || busy}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: row.include, disabled: !row.target }}
                        accessibilityLabel={`Include ${row.label}`}
                        style={[styles.check, row.include && styles.checkOn, !row.target && { opacity: 0.4 }]}
                      >
                        {row.include && <Feather name="check" size={13} color="#fff" />}
                      </TouchableOpacity>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.matchLine}>
                          <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
                          <Feather name="arrow-right" size={13} color={colors.textDim} />
                          <TouchableOpacity style={styles.target} onPress={() => setChoosingFor(i)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Class for ${row.label}`}>
                            <Text style={[styles.targetText, !row.target && { color: colors.accentRed }]}>{row.target ? row.target.label : 'Choose class'}</Text>
                            <Feather name="chevron-down" size={13} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.meta}>{teaching} periods · {row.slots.length} subjects</Text>
                        {!row.target && !!row.matchReason && <Text style={styles.warn}>{row.matchReason}</Text>}
                        {row.match && !row.canSave && !row.target && <Text style={styles.warn}>You can only import your own homeroom class.</Text>}
                        {row.warnings.slice(0, 2).map((w) => <Text key={w} style={styles.warnDim} numberOfLines={2}>{w}</Text>)}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              {imp.duplicateTargets && <Text style={styles.error}>Two PDF classes point to the same class — fix one before saving.</Text>}
              {!!imp.error && <Text style={styles.error}>{imp.error}</Text>}
              <TouchableOpacity
                style={[styles.primaryBtn, (!imp.chosen.length || imp.duplicateTargets || busy) && { opacity: 0.6 }]}
                disabled={!imp.chosen.length || imp.duplicateTargets || busy}
                onPress={imp.save}
                accessibilityRole="button"
              >
                {imp.step === 'saving' ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.primaryText}>Save {imp.chosen.length} {imp.chosen.length === 1 ? 'timetable' : 'timetables'}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {imp.step === 'done' && (
            <>
              {imp.results.map((r) => (
                <View key={`${r.grade}|${r.section}`} style={styles.resultRow}>
                  <Feather name={r.ok ? 'check-circle' : 'alert-circle'} size={15} color={r.ok ? colors.accentYellow : colors.accentRed} />
                  <Text style={styles.resultText}>
                    {r.grade}{r.section ? ` ${r.section}` : ''}: {r.ok ? `saved (${r.slots} subjects)` : r.error}
                  </Text>
                </View>
              ))}
              <TouchableOpacity style={styles.primaryBtn} onPress={close} accessibilityRole="button">
                <Text style={styles.primaryText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {imp.step === 'pick' && !!imp.error && <Text style={styles.error}>{imp.error}</Text>}
        </View>
      </View>

      {choosingFor !== null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setChoosingFor(null)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setChoosingFor(null)}>
            <View style={styles.pickerCard}>
              <ScrollView>
                {[...targets, null].map((t) => (
                  <TouchableOpacity
                    key={t ? t.label : 'none'}
                    style={styles.pickerRow}
                    onPress={() => { imp.setTarget(choosingFor, t); setChoosingFor(null); }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pickerText}>{t ? t.label : "Don't import"}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { backgroundColor: c.cardDark, borderRadius: 18, borderWidth: 1, borderColor: c.borderColor, padding: 20, width: '100%', maxWidth: 600, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '800', color: c.textHeading },
    note: { fontFamily: fonts.serif, fontSize: 12.5, color: c.textMuted, lineHeight: 18 },
    center: { alignItems: 'center', gap: 10, paddingVertical: 24 },
    row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderColor },
    check: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: c.borderColor, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    checkOn: { backgroundColor: c.accentYellow, borderColor: c.accentYellow },
    matchLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    label: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: c.textHeading, maxWidth: 200 },
    target: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
    targetText: { fontFamily: fonts.serif, fontSize: 13, color: c.textHeading },
    meta: { fontFamily: fonts.serif, fontSize: 12, color: c.textDim },
    warn: { fontFamily: fonts.serif, fontSize: 12, color: c.accentRed },
    warnDim: { fontFamily: fonts.serif, fontSize: 11.5, color: c.textDim },
    error: { fontFamily: fonts.serif, fontSize: 12.5, color: c.accentRed },
    primaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.accentYellow, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
    primaryText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '800', color: '#fff' },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultText: { fontFamily: fonts.serif, fontSize: 13, color: c.textHeading, flex: 1 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    pickerCard: { backgroundColor: c.cardDark, borderRadius: 14, borderWidth: 1, borderColor: c.borderColor, width: 240, maxHeight: 360, overflow: 'hidden' },
    pickerRow: { paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderColor },
    pickerText: { fontFamily: fonts.serif, fontSize: 14, color: c.textMuted },
  });
}
