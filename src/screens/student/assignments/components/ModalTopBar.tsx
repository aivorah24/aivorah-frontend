import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

// ── Shared: themed modal top bar with back arrow ──────────────────────────────
export function ModalTopBar({ title, subtitle, color, colors, icon, onBack }: {
  title: string; subtitle?: string; color: string; colors: AppColors;
  icon: string; onBack: () => void;
}) {
  return (
    <View style={{ backgroundColor: color + '14', borderBottomWidth: 1, borderBottomColor: color + '30' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.75}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="arrow-left" size={18} color={color} />
        </TouchableOpacity>
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textMain, fontFamily: fonts.serif }} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={{ fontSize: 11, color, fontWeight: '600', marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}
