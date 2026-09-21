import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { formatWhen, statusTone } from '../utils/format';
import type { ImportRun } from '../types';

interface Props {
  colors: AppColors;
  selected: ImportRun | null;
  userEmail?: string;
  onClose: () => void;
}

export default function ImportResultsModal({ colors, selected, userEmail, onClose }: Props) {
  const styles = makeStyles(colors);
  return (
    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          {selected && (() => {
            const tone = statusTone(colors, selected.status);
            return (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>{selected.fileName}</Text>
                    <Text style={styles.modalSub}>
                      {selected.type === 'teachers' ? 'Teacher import' : 'Student import'} · Run by {selected.runByEmail === userEmail ? 'you' : selected.runByEmail}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.modalClose} accessibilityRole="button" accessibilityLabel="Close">
                    <Feather name="x" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.badge, styles.modalStatus, { backgroundColor: tone.bg }]}>
                  <View style={[styles.badgeDot, { backgroundColor: tone.dot }]} />
                  <Text style={[styles.badgeText, { color: tone.text }]}>{selected.status}</Text>
                </View>

                <View style={styles.statRow}>
                  <View style={[styles.statCard, { backgroundColor: `${colors.accentGreen}18` }]}>
                    <Text style={[styles.statNum, { color: colors.accentGreen }]}>{selected.importedCount}</Text>
                    <Text style={styles.statLabel}>Imported</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: selected.skippedCount > 0 ? `${colors.accentYellow}20` : colors.bgDark }]}>
                    <Text style={[styles.statNum, { color: selected.skippedCount > 0 ? colors.accentYellow : colors.textMuted }]}>{selected.skippedCount}</Text>
                    <Text style={styles.statLabel}>Skipped</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: colors.bgDark }]}>
                    <Text style={[styles.statNum, { color: colors.textHeading }]}>{selected.importedCount + selected.skippedCount}</Text>
                    <Text style={styles.statLabel}>Total rows</Text>
                  </View>
                </View>

                <View style={styles.metaList}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type</Text>
                    <Text style={styles.metaValue}>{selected.type === 'teachers' ? 'Teachers' : 'Students'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Run by</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{selected.runByEmail}</Text>
                  </View>
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel}>When</Text>
                    <Text style={styles.metaValue}>{formatWhen(selected.createdAt)}</Text>
                  </View>
                </View>

                {selected.skippedCount > 0 && (
                  <View style={styles.noteBox}>
                    <Feather name="alert-triangle" size={13} color={colors.accentYellow} />
                    <Text style={styles.noteText}>
                      {selected.skippedCount} row{selected.skippedCount === 1 ? ' was' : 's were'} skipped — usually a missing name or a duplicate email already in the system. Re-upload just those rows to add them.
                    </Text>
                  </View>
                )}
              </>
            );
          })()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    modalCard: {
      width: '100%', maxWidth: 440, backgroundColor: colors.cardDark, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.borderColor, padding: spacing.xl, gap: spacing.md,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    modalTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.textHeading },
    modalSub: { fontFamily: fonts.serif, fontSize: 12, color: colors.textDim, marginTop: 3 },
    modalClose: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modalStatus: { marginTop: 2 },
    statRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', gap: 3 },
    statNum: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '800' },
    statLabel: { fontFamily: fonts.serif, fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    metaList: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, paddingHorizontal: 14 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 16 },
    metaLabel: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted },
    metaValue: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textHeading, flexShrink: 1, textAlign: 'right' },
    noteBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: `${colors.accentYellow}12`, borderRadius: radius.md, padding: 12 },
    noteText: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textMuted, lineHeight: 16, flex: 1 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700' },
  });
}
