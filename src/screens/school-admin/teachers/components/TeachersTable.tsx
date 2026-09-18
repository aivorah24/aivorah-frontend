import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { TeacherRow, STATUS_LABEL, statusTint, gradeSummary } from '../utils/teachersFormatters';

interface Props {
  items: TeacherRow[];
  onEdit: (t: TeacherRow) => void;
}

export default function TeachersTable({ items, onEdit }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.table}>
      <View style={styles.theadRow}>
        <View style={styles.thNameCol}><Text style={styles.thText}>Teacher</Text></View>
        <View style={styles.thGradeCol}><Text style={styles.thText}>Grades taught</Text></View>
        <View style={styles.thSubCol}><Text style={styles.thText}>Subjects</Text></View>
        <View style={styles.thStatusCol}><Text style={styles.thText}>Status</Text></View>
        <View style={styles.thEditCol} />
      </View>
      {items.map((t, i) => {
        const tint = statusTint(colors, t.status);
        return (
          <View key={t.id} style={[styles.tr, i === items.length - 1 && styles.trLast]}>
            <View style={styles.thNameCol}>
              <View style={styles.nameCell}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(t.name || '?').slice(0, 2).toUpperCase()}</Text></View>
                <View style={{ minWidth: 0 }}>
                  <Text style={styles.tdName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.tdSub} numberOfLines={1}>{t.email}</Text>
                </View>
              </View>
            </View>
            <View style={styles.thGradeCol}>
              <Text style={styles.td} numberOfLines={2}>{gradeSummary(t)}</Text>
            </View>
            <View style={styles.thSubCol}>
              <Text style={styles.td} numberOfLines={2}>{t.subjects.length ? t.subjects.join(', ') : 'Not assigned'}</Text>
            </View>
            <View style={styles.thStatusCol}>
              <View style={[styles.statusPill, { borderColor: `${tint}55`, backgroundColor: `${tint}18` }]}>
                <Text style={[styles.statusPillText, { color: tint }]}>{STATUS_LABEL[t.status]}</Text>
              </View>
            </View>
            <View style={styles.thEditCol}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEdit(t)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${t.name}`}
              >
                <Feather name="edit-2" size={14} color={colors.accentYellow} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    table: { backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.md, overflow: 'hidden' },
    theadRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, backgroundColor: colors.cardHover, paddingVertical: 10 },
    thText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textDim, paddingHorizontal: 12 },
    thNameCol: { flex: 1.6, minWidth: 180 },
    thGradeCol: { flex: 1.2, minWidth: 120 },
    thSubCol: { flex: 1.4, minWidth: 140 },
    thStatusCol: { width: 110 },
    thEditCol: { width: 40, alignItems: 'center' },
    editBtn: { padding: 6 },
    tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingVertical: 10 },
    trLast: { borderBottomWidth: 0 },
    nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    td: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted, paddingHorizontal: 12 },
    tdName: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    tdSub: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.accentOrange}22` },
    avatarText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', color: colors.accentOrange },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
    statusPillText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700' },
  });
}
