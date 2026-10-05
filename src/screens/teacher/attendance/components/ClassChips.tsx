import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AttendanceClass } from '../../../../services/attendanceClient';
import { classKey } from '../utils/attendanceUtils';

export default function ClassChips({ classes, selected, onSelect, styles, colors }: {
  classes: AttendanceClass[];
  selected: AttendanceClass | null;
  onSelect: (c: AttendanceClass) => void;
  styles: any;
  colors: any;
}) {
  return (
    <>
      {classes.map((c) => {
        const active = !!selected && classKey(selected) === classKey(c);
        return (
          <TouchableOpacity
            key={classKey(c)}
            testID={`attendance-class-${c.grade}-${c.section}`}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(c)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Feather name="book-open" size={14} color={active ? colors.accentYellow : colors.textDim} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.grade} · {c.section}</Text>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
