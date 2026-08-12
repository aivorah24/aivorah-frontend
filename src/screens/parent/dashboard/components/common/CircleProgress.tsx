import React from 'react';
import { View, Text, Platform } from 'react-native';
import { fonts } from '../../../../../theme';
import type { AppColors } from '../../../../../theme';

export default function CircleProgress({ pct, colors }: { pct: number; colors: AppColors }) {
  const size = 100;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 100) / 100;

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* @ts-ignore */}
        <svg width={size} height={size} style={{ position: 'absolute' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={colors.accentYellow}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textMain, fontFamily: fonts.serif }}>{pct}%</Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>Weekly{'\n'}Progress</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: colors.accentYellow, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textMain, fontFamily: fonts.serif }}>{pct}%</Text>
      <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>Weekly{'\n'}Progress</Text>
    </View>
  );
}
