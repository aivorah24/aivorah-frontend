import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

// Stacked control row - expands in place when enabled, never stretches to
// match a sibling row.
export default function ControlRow({
  title, subtitle, icon, iconBg, iconColor, enabled, onToggle, colors, children, testID,
}: {
  title: string; subtitle?: string; icon: any; iconBg: string; iconColor: string;
  enabled: boolean; onToggle: (v: boolean) => void; colors: AppColors; children?: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={[styles.controlRow, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
      <View style={styles.controlRowHead}>
        <View style={[styles.controlRowIcon, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={13} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: colors.textMain, fontSize: 13 }]}>{title}</Text>
          {subtitle && <Text style={{ color: colors.textDim, fontFamily: fonts.serif, fontSize: 10.5, marginTop: 1 }}>{subtitle}</Text>}
        </View>
        <Switch testID={testID} value={enabled} onValueChange={onToggle}
          trackColor={{ false: colors.textDim + '30', true: colors.accentYellow + '50' }}
          thumbColor={enabled ? colors.accentYellow : colors.textDim} />
      </View>
      {enabled && children && (
        <View style={[styles.controlRowBody, { borderTopColor: colors.borderColor }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controlRow: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  controlRowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 },
  controlRowIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontWeight: '600', fontFamily: fonts.serif, fontSize: 14 },
  controlRowBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1 },
});
