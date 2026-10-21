import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface KpiCardProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
  value: string | number;
  label: string;
  colors: AppColors;
  styles: any;
}

export default function KpiCard({ icon, color, value, label, colors, styles }: KpiCardProps) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTopRow}>
        <View style={[styles.kpiBar, { backgroundColor: color }]} />
      </View>
      <View style={styles.kpiBody}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kpiValue}>{value}</Text>
          <Text style={styles.kpiLabel}>{label}</Text>
        </View>
        <Feather name={icon} size={16} color={colors.textDim} />
      </View>
    </View>
  );
}
