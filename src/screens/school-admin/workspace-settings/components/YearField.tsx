import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  colors: AppColors;
  years: string[];
}

// On web this is a real <select> so its dropdown renders in the browser's
// native top layer — impossible to clip or be overlapped by the cards below
// it. On native platforms it falls back to a small custom menu.
export default function YearField({ value, onChange, colors, years }: Props) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return React.createElement('select', {
      value,
      onChange: (e: any) => onChange(e.target.value),
      style: {
        width: '100%', height: 42, borderRadius: 8, paddingLeft: 12, paddingRight: 8,
        border: `1px solid ${colors.borderColor}`, background: colors.bgDark,
        color: colors.textHeading, fontSize: 13, fontWeight: 600,
        fontFamily: 'inherit', cursor: 'pointer', appearance: 'auto',
      },
    }, years.map((y) => React.createElement('option', { key: y, value: y }, y.replace('-', '–'))));
  }

  return (
    <View style={{ position: 'relative' }}>
      <Pressable style={styles.fieldBox} onPress={() => setOpen((v) => !v)} accessibilityRole="button">
        <Text style={styles.fieldBoxText}>{value ? value.replace('-', '–') : 'Select'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textDim} />
      </Pressable>
      {open && (
        <>
          <Pressable style={styles.ddBackdropNative} onPress={() => setOpen(false)} />
          <View style={styles.ddMenu}>
            {years.map((y) => (
              <Pressable key={y} style={styles.ddItem} onPress={() => { onChange(y); setOpen(false); }} accessibilityRole="button">
                <Text style={[styles.ddItemText, y === value && styles.ddItemTextActive]}>{y.replace('-', '–')}</Text>
                {y === value && <Feather name="check" size={13} color={colors.accentYellow} />}
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    fieldBox: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark,
      borderRadius: radius.sm, paddingHorizontal: 12, height: 42,
    },
    fieldBoxText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textHeading, flexShrink: 1 },
    ddBackdropNative: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 19 },
    ddMenu: {
      position: 'absolute', top: 46, left: 0, right: 0, backgroundColor: colors.cardDark,
      borderWidth: 1, borderColor: colors.borderColor, borderRadius: radius.sm, paddingVertical: 4,
      zIndex: 21, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    },
    ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9 },
    ddItemText: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.textMuted },
    ddItemTextActive: { color: colors.textHeading, fontWeight: '700' },
  });
}
