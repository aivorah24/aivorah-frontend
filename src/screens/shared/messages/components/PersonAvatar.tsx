import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { pastelBg, pastelText, initials } from '../../../../features/channels/utils/avatar';

export function renderPersonAvatar(
  name: string,
  role?: string,
  photoUrl?: string,
  size: number = 44,
  isAivorahItem: boolean = false,
  colors?: any
) {
  const radius = size / 2;
  if (isAivorahItem) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: (colors?.accentYellow || '#BAA467') + '20', borderWidth: 1, borderColor: (colors?.accentYellow || '#BAA467') + '50', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Feather name="cpu" size={Math.round(size * 0.42)} color={colors?.accentYellow || '#BAA467'} />
      </View>
    );
  }
  if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim()) {
    return (
      <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: radius, flexShrink: 0 }} />
    );
  }
  const bg = pastelBg(name);
  const fg = pastelText(name);
  const init = initials(name);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Text style={{ fontSize: Math.round(size * 0.38), fontWeight: '700', color: fg }}>{init}</Text>
    </View>
  );
}
