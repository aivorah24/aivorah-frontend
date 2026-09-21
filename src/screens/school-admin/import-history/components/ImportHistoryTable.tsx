import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { formatWhen, statusTone } from '../utils/format';
import type { ImportRun } from '../types';

interface Props {
  colors: AppColors;
  runs: ImportRun[];
  userEmail?: string;
  onSelect: (run: ImportRun) => void;
}

export default function ImportHistoryTable({ colors, runs, userEmail, onSelect }: Props) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.table}>
      <View style={styles.theadRow}>
        <View style={styles.colFile}><Text style={styles.thText}>File</Text></View>
        <View style={styles.colCount}><Text style={styles.thText}>Imported</Text></View>
        <View style={styles.colCount}><Text style={styles.thText}>Skipped</Text></View>
        <View style={styles.colStatus}><Text style={styles.thText}>Status</Text></View>
        <View style={styles.colAction} />
      </View>
      {runs.map((r, i) => {
        const tone = statusTone(colors, r.status);
        return (
          <View key={r.id} style={[styles.tr, i === runs.length - 1 && styles.trLast]}>
            <View style={styles.colFile}>
              <Text style={styles.tdStrong} numberOfLines={1}>{r.fileName}</Text>
              <Text style={styles.tdSub} numberOfLines={1}>
                Run by {r.runByEmail === userEmail ? 'you' : r.runByEmail} · {formatWhen(r.createdAt)} · {r.type === 'teachers' ? 'Teachers' : 'Students'}
              </Text>
            </View>
            <View style={styles.colCount}><Text style={styles.td}>{r.importedCount} row{r.importedCount === 1 ? '' : 's'}</Text></View>
            <View style={styles.colCount}><Text style={styles.td}>{r.skippedCount} row{r.skippedCount === 1 ? '' : 's'}</Text></View>
            <View style={styles.colStatus}>
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <View style={[styles.badgeDot, { backgroundColor: tone.dot }]} />
                <Text style={[styles.badgeText, { color: tone.text }]}>{r.status}</Text>
              </View>
            </View>
            <View style={styles.colAction}>
              <TouchableOpacity onPress={() => onSelect(r)} accessibilityRole="button" accessibilityLabel={`View results for ${r.fileName}`}>
                <Text style={styles.actionLink}>View results</Text>
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
    thText: { fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textDim },
    tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingVertical: 12 },
    trLast: { borderBottomWidth: 0 },
    colFile: { flex: 2.4, minWidth: 200, paddingHorizontal: 14 },
    colCount: { flex: 1, minWidth: 90, paddingHorizontal: 14 },
    colStatus: { flex: 1.5, minWidth: 150, paddingHorizontal: 14 },
    colAction: { width: 110, paddingHorizontal: 14, alignItems: 'flex-end' },
    td: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted },
    tdStrong: { fontFamily: fonts.serif, fontSize: 13.5, fontWeight: '700', color: colors.textHeading },
    tdSub: { fontFamily: fonts.serif, fontSize: 11.5, color: colors.textDim, marginTop: 2 },
    actionLink: { fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '700', color: colors.accentYellow },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700' },
  });
}
