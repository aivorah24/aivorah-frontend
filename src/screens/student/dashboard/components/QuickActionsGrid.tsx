import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { QUICK_NAV } from '../constants';
import { SectionHeader } from './common/SectionHeader';
import type { makeStyles } from '../DashboardScreen';

interface QuickActionsGridProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  cardBg: string;
  navigation: { navigate: (screen: string) => void };
}

// Quick Actions grid — hidden entirely when a parent is viewing a child's
// dashboard (childOverride truthy), same as before extraction.
export function QuickActionsGrid({ styles, colors, isDark, cardBg, navigation }: QuickActionsGridProps) {
  return (
    <>
      <SectionHeader title="Quick Actions" sub="Jump anywhere instantly" />
      <View style={styles.quickGrid}>
        {QUICK_NAV.map(item => (
          <TouchableOpacity
            key={item.label}
            style={[styles.quickCard, { backgroundColor: isDark ? cardBg : item.pastel, borderColor: isDark ? item.color + '40' : 'transparent' }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIconBox, { backgroundColor: isDark ? item.color + '20' : item.color + '22' }]}>
              <Feather name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.quickArrowBox}>
              <Feather name="arrow-up-right" size={13} color={item.color + 'cc'} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.textMain }]}>{item.label}</Text>
            <Text style={[styles.quickDesc, { color: colors.textMuted }]}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
