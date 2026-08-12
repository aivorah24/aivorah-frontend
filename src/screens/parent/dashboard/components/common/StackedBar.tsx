import React from 'react';
import { View } from 'react-native';
import type { AppColors } from '../../../../../theme';

export default function StackedBar({
  minutes, maxMinutes, isGoalMet, colors,
}: { minutes: number; maxMinutes: number; isGoalMet: boolean; colors: AppColors }) {
  const SEGMENTS = 10;
  const active = maxMinutes > 0 ? Math.max(0, Math.round((minutes / maxMinutes) * SEGMENTS)) : 0;
  return (
    <View style={{ flexDirection: 'column', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const isActive = i >= SEGMENTS - active;
        return (
          <View
            key={i}
            style={{
              width: 22, height: 7, borderRadius: 3,
              backgroundColor: isActive
                ? (isGoalMet ? colors.accentYellow : colors.accentYellow + 'AA')
                : 'rgba(255,255,255,0.06)',
            }}
          />
        );
      })}
    </View>
  );
}
