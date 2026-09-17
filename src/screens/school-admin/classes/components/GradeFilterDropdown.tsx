import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface GradeFilterDropdownProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  colors: AppColors;
  open: boolean;
  onToggle: () => void;
}

export function GradeFilterDropdown({ value, options, onChange, colors, open, onToggle }: GradeFilterDropdownProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={{ position: 'relative' }}>
      <Pressable style={styles.filterTrigger} onPress={onToggle} accessibilityRole="button">
        <Text style={styles.filterTriggerText}>{value || 'All grades'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textDim} />
      </Pressable>
      {open && (
        <>
          <Pressable style={Platform.select({ web: styles.ddBackdropWeb, default: styles.ddBackdropNative }) as any} onPress={onToggle} />
          <View style={styles.filterMenu}>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <Pressable style={({ hovered }: any) => [styles.ddItem, Platform.OS === 'web' && hovered && styles.ddItemHovered]} onPress={() => { onChange(''); onToggle(); }}>
                <Text style={[styles.ddItemText, !value && styles.ddItemTextActive]}>All grades</Text>
                {!value && <Feather name="check" size={13} color={colors.accentYellow} />}
              </Pressable>
              {options.map((g) => (
                <Pressable key={g} style={({ hovered }: any) => [styles.ddItem, Platform.OS === 'web' && hovered && styles.ddItemHovered]} onPress={() => { onChange(g); onToggle(); }}>
                  <Text style={[styles.ddItemText, value === g && styles.ddItemTextActive]}>{g}</Text>
                  {value === g && <Feather name="check" size={13} color={colors.accentYellow} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    filterTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: radius.sm, paddingHorizontal: 14, height: 40, minWidth: 160, justifyContent: 'space-between' },
    filterTriggerText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textHeading },
    ddBackdropWeb: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 },
    ddBackdropNative: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 19 },
    filterMenu: { position: 'absolute', top: 44, left: 0, minWidth: 200, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 4, zIndex: 21, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9 },
    ddItemHovered: { backgroundColor: colors.cardHover },
    ddItemText: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted },
    ddItemTextActive: { color: colors.textHeading, fontWeight: '700' },
  });
}
