import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../../context/ThemeContext';

export function SectionHead({ icon, iconBg, iconColor, title, sub }: { icon: string; iconBg: string; iconColor: string; title: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 1 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}
