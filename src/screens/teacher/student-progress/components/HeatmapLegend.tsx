import React from 'react';
import { View, Text } from 'react-native';
import type { AppColors } from '../../../../theme';
import { MASTERY_META } from '../utils/masteryDisplay';
import type { TopicMasteryStatus } from '../types';

const ORDER: TopicMasteryStatus[] = ['mastered', 'trying', 'dropped', 'stuck', 'not_started'];

export default function HeatmapLegend({ colors }: { colors: AppColors }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingVertical: 8 }}>
      {ORDER.map((status) => {
        const meta = MASTERY_META[status];
        return (
          <View key={status} testID={`legend-${status}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.color }} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{meta.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
