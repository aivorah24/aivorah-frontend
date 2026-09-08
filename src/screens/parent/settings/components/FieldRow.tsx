import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function FieldRow({ label, sub, btnLabel, onPress, styles, badgeOnly }: {
  label: string; sub: string; btnLabel: string; onPress: () => void; styles: any; badgeOnly?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldSub} numberOfLines={1}>{sub}</Text>
      </View>
      <TouchableOpacity
        style={badgeOnly ? [styles.changeBtn, { borderColor: '#E5A93C40', backgroundColor: '#E5A93C18' }] : styles.changeBtn}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.changeBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
