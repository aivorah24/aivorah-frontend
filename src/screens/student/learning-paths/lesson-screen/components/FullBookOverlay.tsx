import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { bookSrc, bookLabel } from '../utils/book';
import { makeStyles } from '../styles';

export default function FullBookOverlay({
  visible,
  topic,
  grade,
  subject,
  colors,
  styles,
  onClose,
}: {
  visible: boolean;
  topic: any;
  grade: string;
  subject: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  onClose: () => void;
}) {
  if (!visible || Platform.OS !== 'web' || !topic.pdfFile) return null;
  return (
    <View style={styles.fullBookOverlay}>
      <View style={[styles.fullBookHeader, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
        <TouchableOpacity style={styles.fullBookExit} onPress={onClose}>
          <Feather name="x" size={16} color={colors.textMain} />
          <Text style={{ color: colors.textMain, fontWeight: '700', fontSize: 13 }}>Back to Learning</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
          {bookLabel(topic, grade, subject)} — {grade} {subject} · full book, use the built-in page controls to browse
        </Text>
        <View style={{ width: 130 }} />
      </View>
      {React.createElement('iframe', {
        src: `${bookSrc(topic, grade, subject)}#page=${topic.pdfPage ?? 1}&view=FitH`,
        style: { flex: 1, border: 'none', width: '100%', height: '100%' },
        title: `Full book — ${topic.pdfFile}`,
      })}
    </View>
  );
}
