import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { ParentRow, STATUS_LABEL, statusTint } from '../utils/parentsFormatters';

interface Props {
  parent: ParentRow | null;
  onClose: () => void;
}

export default function ParentDetailModal({ parent, onClose }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={!!parent} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          {parent && (
            <>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(parent.name || '?').slice(0, 2).toUpperCase()}</Text></View>
                  <View style={{ minWidth: 0 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>{parent.name}</Text>
                    <Text style={styles.tdSub} numberOfLines={1}>{parent.email}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Close">
                  <Feather name="x" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Status</Text>
                <View style={[styles.statusPill, { borderColor: `${statusTint(colors, parent.status)}55`, backgroundColor: `${statusTint(colors, parent.status)}18` }]}>
                  <Text style={[styles.statusPillText, { color: statusTint(colors, parent.status) }]}>{STATUS_LABEL[parent.status]}</Text>
                </View>
              </View>

              {!!parent.joinedAt && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Joined</Text>
                  <Text style={styles.modalValue}>{parent.joinedAt}</Text>
                </View>
              )}

              <Text style={[styles.modalLabel, { marginTop: 14, marginBottom: 6 }]}>Linked students</Text>
              {parent.linkedStudents.length === 0 ? (
                <Text style={styles.modalValue}>None linked yet.</Text>
              ) : (
                parent.linkedStudents.map((s) => (
                  <View key={s} style={styles.linkedStudentRow}>
                    <Feather name="user" size={13} color={colors.textDim} />
                    <Text style={styles.modalValue}>{s}</Text>
                  </View>
                ))
              )}

              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} accessibilityRole="button">
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.accentRed}22` },
    avatarText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', color: colors.accentRed },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
    statusPillText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700' },
    tdSub: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalBox: { width: '100%', maxWidth: 420, backgroundColor: colors.cardDark, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderColor, padding: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.textHeading },
    modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    modalLabel: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim },
    modalValue: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted },
    linkedStudentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    modalCloseBtn: { marginTop: 18, alignSelf: 'center', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 22, backgroundColor: colors.accentYellow },
    modalCloseBtnText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: '#0B0B0B' },
  });
}
