import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Category } from '../../../../services/currentAffairsApi';
import { CATEGORIES, GOLD } from '../constants';

// Gold pill with an icon — the same tag World & You uses for its categories.
export default function CategoryBadge({ category }: { category: Category }) {
  const cat = CATEGORIES[category];
  return (
    <View style={[s.badge, { backgroundColor: GOLD + '18', borderColor: GOLD + '40' }]}>
      <Feather name={(cat?.icon || 'radio') as any} size={11} color={GOLD} />
      <Text style={[s.text, { color: GOLD }]}>{cat?.label || category}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
