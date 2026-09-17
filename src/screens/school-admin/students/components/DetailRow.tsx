import React from 'react';
import { View, Text } from 'react-native';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

export function DetailRow({ label, value, colors }: { label: string; value: string; colors: AppColors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 12.5, color: colors.textDim }}>{label}</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 12.5, fontWeight: '600', color: colors.textHeading }} selectable>{value}</Text>
    </View>
  );
}
