import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Shared section-label row used across every settings card (Profile,
// Branding, Security, Teaching Preferences, Notifications, Appearance).
export default function SectionHeader({ icon, label, color, styles }: { icon: any; label: string; color: string; styles: any }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Feather name={icon} size={15} color={color} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}
