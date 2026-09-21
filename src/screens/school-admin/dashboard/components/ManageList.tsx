import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { ManageRow } from '../types';

interface ManageListProps {
  manageRows: ManageRow[];
  colors: AppColors;
}

export default function ManageList({ manageRows, colors }: ManageListProps) {
  return (
    <View style={styles.mainCol}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>MANAGE</Text>
      <View style={[styles.manageList, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
        {manageRows.map((row, i) => (
          <ManageListRow
            key={row.key}
            row={row}
            colors={colors}
            isLast={i === manageRows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function ManageListRow({ row, colors, isLast }: { row: ManageRow; colors: AppColors; isLast: boolean }) {
  return (
    <Pressable
      onPress={row.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.caption}`}
      style={({ hovered, pressed }: any) => [
        rowStyles.row,
        { borderColor: colors.borderColor },
        isLast && { borderBottomWidth: 0 },
        Platform.OS === 'web' && hovered && { backgroundColor: colors.cardHover },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[rowStyles.icon, { backgroundColor: `${colors.accentYellow}18` }]}>
        <Feather name={row.icon as any} size={17} color={colors.accentYellow} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[rowStyles.title, { color: colors.textHeading }]}>{row.title}</Text>
        <Text style={[rowStyles.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {row.caption}
        </Text>
      </View>
      {row.meta && <Text style={[rowStyles.meta, { color: colors.textDim }]}>{row.meta}</Text>}
      <Feather name="chevron-right" size={16} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mainCol: { flex: 1, minWidth: 0 },
  sectionLabel: {
    fontFamily: fonts.serif,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8, // spacing.sm
  },
  manageList: {
    borderWidth: 1,
    borderRadius: 8, // radius.md
    paddingHorizontal: 16, // spacing.md
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  caption: { fontFamily: fonts.serif, fontSize: 12, marginTop: 2 },
  meta: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', flexShrink: 0 },
});
