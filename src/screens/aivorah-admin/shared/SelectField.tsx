import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { radius } from '../../../theme';
import type { AppColors } from '../../../theme';

export type SelectOption = string | { value: string; label: string };

const optValue = (o: SelectOption) => (typeof o === 'string' ? o : o.value);
const optLabel = (o: SelectOption) => (typeof o === 'string' ? o : o.label);

// Single-select dropdown anchored under its trigger. With `allLabel`, the first
// option is "All …" and selecting it sets the value to 'all'.
export function SelectField({ testID, label, allLabel, placeholder, value, options, onChange, minWidth = 160 }: {
  testID: string;
  label?: string;
  allLabel?: string;
  placeholder?: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  minWidth?: number;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null);
  const triggerRef = useRef<View>(null);

  const all = allLabel ? [{ value: 'all', label: allLabel }] : [];
  const list: SelectOption[] = [...all, ...options];
  const current = list.find((o) => optValue(o) === value);
  const isSet = !!value && value !== 'all';

  function openMenu() {
    setAnchor(null);
    setOpen(true);
    triggerRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y: y + height + 4, width }));
  }

  return (
    <View style={{ minWidth }}>
      {!!label && <Text style={s.label}>{label.toUpperCase()}</Text>}
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity testID={testID} style={[s.trigger, isSet && s.triggerActive]} onPress={openMenu} activeOpacity={0.7}>
          <Text style={[s.triggerText, !current && s.placeholder]} numberOfLines={1}>
            {current ? optLabel(current) : placeholder || 'Select…'}
          </Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[
              s.dropdown,
              { position: 'absolute', top: anchor?.y ?? 0, left: anchor?.x ?? 0, width: Math.max(anchor?.width ?? 0, 200), opacity: anchor ? 1 : 0 },
            ]}
          >
            <ScrollView style={{ maxHeight: 280 }}>
              {list.map((o) => {
                const v = optValue(o);
                const on = v === value;
                return (
                  <TouchableOpacity key={v} testID={`${testID}-option-${v}`} style={s.option} onPress={() => { onChange(v); setOpen(false); }}>
                    <Text style={[s.optionText, on && s.optionTextActive]} numberOfLines={1}>{optLabel(o)}</Text>
                    {on && <Feather name="check" size={14} color={colors.accentYellow} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    label: { fontSize: 11, fontWeight: '700', color: colors.textDim, letterSpacing: 0.4 },
    trigger: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      height: 36, paddingHorizontal: 12, borderRadius: radius.sm, marginTop: 6,
      borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark,
    },
    triggerActive: { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '0F' },
    triggerText: { fontSize: 13, color: colors.textMain, flexShrink: 1 },
    placeholder: { color: colors.textDim },
    dropdown: {
      backgroundColor: colors.cardDark, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
    },
    option: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.borderColor,
    },
    optionText: { fontSize: 13, color: colors.textMain, flexShrink: 1 },
    optionTextActive: { color: colors.accentYellow, fontWeight: '700' },
  });
}
