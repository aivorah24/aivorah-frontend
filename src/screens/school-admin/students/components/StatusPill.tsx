import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { fonts } from '../../../../theme';

interface StatusPillProps {
  label: string;
  tint: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, tint, style }: StatusPillProps) {
  return (
    <View style={[
      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, flexShrink: 0 },
      { borderColor: `${tint}55`, backgroundColor: `${tint}18` },
      style,
    ]}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 10.5, fontWeight: '700', color: tint }}>{label}</Text>
    </View>
  );
}
