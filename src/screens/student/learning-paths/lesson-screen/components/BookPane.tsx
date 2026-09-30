import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { bookSrc, bookLabel } from '../utils/book';
import { makeStyles } from '../styles';

export default function BookPane({
  topic,
  grade,
  subject,
  colors,
  styles,
  onReadFullBook,
}: {
  topic: any;
  grade: string;
  subject: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  onReadFullBook: () => void;
}) {
  return (
    <View style={[styles.rightPane, { borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}>
      <View style={{ marginHorizontal: 0, marginBottom: 8, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="file-text" size={12} color={colors.textMuted} />
          <Text style={[styles.paneLabelText, { color: colors.textMuted }]} numberOfLines={1}>
            {topic.bookUrl ? bookLabel(topic, grade, subject) : `Original Textbook · ${bookLabel(topic, grade, subject)}, ${grade} ${subject}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.fullBookBtn, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}
          onPress={onReadFullBook}
        >
          <Feather name="maximize-2" size={10} color={colors.primary} />
          <Text style={[styles.fullBookBtnText, { color: colors.primary }]}>Read full book</Text>
        </TouchableOpacity>
      </View>
      {React.createElement('iframe', {
        src: `${bookSrc(topic, grade, subject)}#page=${topic.pdfPage}&view=FitH`,
        style: { flex: 1, border: 'none', width: '100%', height: '100%', backgroundColor: colors.cardDark },
        title: `${topic.name} — real textbook page`,
      })}
    </View>
  );
}
