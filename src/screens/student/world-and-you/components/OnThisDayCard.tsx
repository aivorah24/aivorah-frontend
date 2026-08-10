import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { OnThisDay } from '../types';
import { TEAL } from '../constants';

interface Props {
  items: OnThisDay[];
  styles: any;
  colors: AppColors;
}

export default function OnThisDayCard({ items, styles, colors }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: TEAL + '20' }]}>
          <Feather name="clock" size={15} color={TEAL} />
        </View>
        <View>
          <Text style={[styles.cardTitle, { color: TEAL }]}>On This Day</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>Historical highlights</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: TEAL + '25' }]} />

      {items.map((item, i) => (
        <View key={i} style={styles.factRow}>
          <View style={[styles.yearBadge, { backgroundColor: TEAL + '18', borderColor: TEAL + '35' }]}>
            <Text style={[styles.yearText, { color: TEAL }]}>{item.year}</Text>
          </View>
          <Text style={[styles.factText, { color: colors.textMain }]}>{item.fact}</Text>
        </View>
      ))}
    </View>
  );
}
