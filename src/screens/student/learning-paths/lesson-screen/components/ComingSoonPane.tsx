import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { makeStyles } from '../styles';

// Shared "no content yet" state for every lesson tab (Learn, Listen, Ask
// Aivorah, Practice) — a topic that's on the syllabus but has no generated
// content must say so plainly and consistently, not render a half-empty
// version of whichever tab the student happened to tap.
export default function ComingSoonPane({
  topicName,
  colors,
  styles,
}: {
  topicName: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.dualPane}>
      <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: 12 }]}>
        <Feather name="book-open" size={32} color={colors.textMuted} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
          Content coming soon
        </Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 420 }}>
          We&apos;re preparing the lesson for &quot;{topicName}&quot;. This topic is on the syllabus and will unlock here as soon as it&apos;s ready.
        </Text>
      </ScrollView>
    </View>
  );
}
