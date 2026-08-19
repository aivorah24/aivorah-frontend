import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { fonts } from '../../../../../theme';
import { useTheme } from '../../../../../context/ThemeContext';
import { BRAND } from '../../constants';

export function SectionHeader({ title, sub, onPress, linkLabel }: { title: string; sub?: string; onPress?: () => void; linkLabel?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain, letterSpacing: -0.3, fontFamily: fonts.serif }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {onPress && linkLabel ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.violet }}>{linkLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
