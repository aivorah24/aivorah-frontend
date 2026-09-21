import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface Props {
  colors: AppColors;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export default function SectionCard({ colors, title, subtitle, right, children }: Props) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        {right ? <View style={styles.sectionHeaderAction}>{right}</View> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function Row({ colors, label, value, last }: { colors: AppColors; label: string; value: string; last?: boolean }) {
  const styles = makeStyles(colors);
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    section: { marginBottom: spacing.xxl },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    sectionHeaderAction: { flexShrink: 0, marginBottom: spacing.md },
    sectionTitle: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '700', color: colors.textHeading },
    sectionSubtitle: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted, marginTop: 3, marginBottom: spacing.md },
    sectionBody: {
      backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor,
      borderRadius: radius.md, padding: spacing.lg, gap: spacing.md,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted },
    rowValue: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textHeading, maxWidth: '60%' },
  });
}
