import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const OPTIONS = [
  { id: 'dark', icon: 'moon', label: 'Dark' },
  { id: 'light', icon: 'sun', label: 'Light' },
  { id: 'auto', icon: 'monitor', label: 'Auto' },
] as const;

export default function AppearanceCard({ themeMode, setThemeMode, styles, colors }: {
  themeMode: string; setThemeMode: (m: any) => void; styles: any; colors: any;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.fieldLabel}>Theme</Text>
      <View style={styles.themeRow}>
        {OPTIONS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.themeOption, themeMode === t.id && styles.themeOptionActive]}
            onPress={() => setThemeMode(t.id)}
            activeOpacity={0.7}
          >
            <Feather name={t.icon} size={16} color={themeMode === t.id ? colors.accentYellow : colors.textMuted} />
            <Text style={[styles.themeLabel, themeMode === t.id && { color: colors.accentYellow }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
