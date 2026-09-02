import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ReportSection({ title, icon, colors, styles, children }: any) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIcon}>
          <Feather name={icon} size={13} color={colors.accentYellow} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}
