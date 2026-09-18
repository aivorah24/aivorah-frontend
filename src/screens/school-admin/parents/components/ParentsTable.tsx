import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { ParentRow, STATUS_LABEL, statusTint } from '../utils/parentsFormatters';

interface Props {
  items: ParentRow[];
  onSelect: (p: ParentRow) => void;
}

export default function ParentsTable({ items, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.table}>
      <View style={styles.theadRow}>
        <View style={styles.thNameCol}><Text style={styles.thText}>Parent / Guardian</Text></View>
        <View style={styles.thLinkCol}><Text style={styles.thText}>Linked students</Text></View>
        <View style={styles.thStatusCol}><Text style={styles.thText}>Status</Text></View>
      </View>
      {items.map((p, i) => {
        const tint = statusTint(colors, p.status);
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.tr, i === items.length - 1 && styles.trLast]}
            onPress={() => onSelect(p)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`View ${p.name}`}
          >
            <View style={styles.thNameCol}>
              <View style={styles.nameCell}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(p.name || '?').slice(0, 2).toUpperCase()}</Text></View>
                <View style={{ minWidth: 0 }}>
                  <Text style={styles.tdName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.tdSub} numberOfLines={1}>{p.email}</Text>
                </View>
              </View>
            </View>
            <View style={styles.thLinkCol}>
              <Text style={styles.td} numberOfLines={1}>{p.linkedStudents.length ? p.linkedStudents.join(', ') : 'None linked'}</Text>
            </View>
            <View style={styles.thStatusCol}>
              <View style={[styles.statusPill, { borderColor: `${tint}55`, backgroundColor: `${tint}18` }]}>
                <Text style={[styles.statusPillText, { color: tint }]}>{STATUS_LABEL[p.status]}</Text>
              </View>
            </View>
          </TouchableOpacity>
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
    thLinkCol: { flex: 1.6, minWidth: 160 },
    thStatusCol: { width: 110 },
    tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingVertical: 10 },
    trLast: { borderBottomWidth: 0 },
    nameCell: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
    td: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted, paddingHorizontal: 12 },
    tdName: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: colors.textHeading },
    tdSub: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.accentRed}22` },
    avatarText: { fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', color: colors.accentRed },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
    statusPillText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700' },
  });
}
