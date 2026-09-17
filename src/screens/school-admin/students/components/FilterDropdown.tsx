import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  colors: AppColors;
}

/**
 * Lightweight dropdown filter component (web + native).
 * Displays a trigger button that opens a menu with selectable options.
 * Used for status, grade, section, and curriculum filters.
 */
export function FilterDropdown({ label, value, options, onChange, colors }: FilterDropdownProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label || label;

  return (
    <View style={{ position: 'relative', zIndex: open ? 20 : 1 }}>
      <Pressable 
        style={styles.ddTrigger} 
        onPress={() => setOpen((o) => !o)} 
        accessibilityRole="button"
      >
        <Text style={styles.ddTriggerText} numberOfLines={1}>
          {current}
        </Text>
        <Feather 
          name={open ? 'chevron-up' : 'chevron-down'} 
          size={14} 
          color={colors.textDim} 
        />
      </Pressable>
      {open && (
        <>
          <Pressable style={styles.ddBackdrop} onPress={() => setOpen(false)} />
          <View style={styles.ddMenu}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  style={({ hovered }: any) => [
                    styles.ddItem,
                    Platform.OS === 'web' && hovered && styles.ddItemHovered,
                    o.value === value && styles.ddItemActive,
                  ]}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.ddItemText, 
                      o.value === value && styles.ddItemTextActive
                    ]}
                  >
                    {o.label}
                  </Text>
                  {o.value === value && (
                    <Feather name="check" size={13} color={colors.accentYellow} />
                  )}
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
    ddTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      minWidth: 140,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: colors.cardDark,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      height: 36,
    },
    ddTriggerText: {
      fontFamily: fonts.serif,
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textHeading,
      flexShrink: 1,
    },
    ddBackdrop: Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 19,
      },
      default: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        zIndex: 19,
      },
    }) as any,
    ddMenu: {
      position: 'absolute',
      top: 40,
      left: 0,
      minWidth: 180,
      backgroundColor: colors.cardDark,
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: radius.sm,
      paddingVertical: 4,
      zIndex: 21,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      // maxHeight must live here, not just on the inner ScrollView — an
      // absolutely-positioned, auto-sized container won't clip a long list
      // on web based on a child's maxHeight alone.
      maxHeight: 260,
      overflow: 'hidden',
    },
    ddItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    ddItemHovered: {
      backgroundColor: colors.cardHover,
    },
    ddItemActive: {
      backgroundColor: `${colors.accentYellow}14`,
    },
    ddItemText: {
      fontFamily: fonts.serif,
      fontSize: 12.5,
      color: colors.textMuted,
    },
    ddItemTextActive: {
      color: colors.textHeading,
      fontWeight: '700',
    },
  });
}
