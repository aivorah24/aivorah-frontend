import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { STATUS_META, type StudentStatus } from '../../utils/studentStatus';

export function StudentStatusBadge({ status, testID }: { status: StudentStatus; testID?: string }) {
  const m = STATUS_META[status];
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: m.bg, borderColor: m.color + '40' }]}>
      <Feather name={m.icon as any} size={11} color={m.color} />
      <Text style={[styles.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
  },
  text: { fontSize: 10, fontWeight: '700' },
});
