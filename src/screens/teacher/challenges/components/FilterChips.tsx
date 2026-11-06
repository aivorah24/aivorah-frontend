import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { makeStyles } from '../styles';

// A row of pill buttons where exactly one is selected. Used for the
// leaderboard period (Today / This Week / ...) and grade (By XP / Grade 4 ...)
// filters. Plain pills rather than a dropdown menu: an absolutely-positioned
// menu can't be tapped outside its parent's bounds on Android.
export default function FilterChips<K extends string>({ options, value, onChange, styles, label }: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  styles: ReturnType<typeof makeStyles>;
  label: string; // accessibility name for the group, e.g. "Leaderboard period"
}) {
  return (
    <View style={styles.filterChipRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(o => {
        const selected = o.key === value;
        return (
          <TouchableOpacity
            key={o.key || '__all'}
            style={[styles.filterChip, selected && styles.filterChipActive]}
            onPress={() => { if (!selected) onChange(o.key); }}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
