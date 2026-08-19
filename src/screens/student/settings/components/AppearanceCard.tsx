import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME_OPTIONS } from '../constants';

interface AppearanceCardProps {
  themeMode: string;
  setThemeMode: (mode: any) => void;
  colors: any;
  styles: any;
}

export default function AppearanceCard({ themeMode, setThemeMode, colors, styles }: AppearanceCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.fieldLabel}>Theme</Text>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map((t) => {
          const active = themeMode === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.themeOption, active && styles.themeOptionActive]}
              onPress={() => setThemeMode(t.id)}
              activeOpacity={0.7}
              testID={`settings-theme-${t.id}-option`}
            >
              {active && (
                <View style={styles.themeCheck} testID={`settings-theme-${t.id}-check`}>
                  <Feather name="check" size={11} color="#fff" />
                </View>
              )}
              <Feather name={t.icon} size={24} color={active ? colors.accentYellow : colors.textMuted} />
              <Text style={[styles.themeLabel, active && { color: colors.accentYellow }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
