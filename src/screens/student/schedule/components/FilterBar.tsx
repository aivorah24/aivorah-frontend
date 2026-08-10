import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  filterType: string;
  setFilterType: (t: any) => void;
  hideCompleted: boolean;
  setHideCompleted: (v: boolean) => void;
  styles: any;
  colors: AppColors;
}

const FILTERS = [
  { key: 'all', icon: 'grid' as const, label: 'All Events' },
  { key: 'assignments', icon: 'flag' as const, label: 'Assignments & Deadlines' },
  { key: 'study', icon: 'clock' as const, label: 'Personal Study' },
];

export default function FilterBar({ filterType, setFilterType, hideCompleted, setHideCompleted, styles, colors }: Props) {
  return (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, alignItems: 'center' }}>
        {FILTERS.map(item => {
          const active = filterType === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilterType(item.key)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              testID={`schedule-filter-${item.key}`}
            >
              <Feather name={item.icon} size={13} color={active ? colors.accentYellow : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ width: 1, height: 20, backgroundColor: colors.borderColor, marginHorizontal: 4 }} />

        <TouchableOpacity
          style={[styles.toggleChip, hideCompleted && styles.toggleChipActive]}
          onPress={() => setHideCompleted(!hideCompleted)}
          accessible
          accessibilityRole="checkbox"
          accessibilityLabel="Hide Completed"
          accessibilityState={{ checked: hideCompleted }}
          testID="schedule-hide-completed"
        >
          <Feather name={hideCompleted ? 'check-square' : 'square'} size={15} color={hideCompleted ? colors.accentYellow : colors.textMuted} />
          <Text style={[styles.toggleChipText, hideCompleted && { color: colors.accentYellow, fontWeight: '700' }]}>
            Hide Completed
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
