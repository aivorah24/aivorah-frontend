import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { spacing } from '../../../../../theme';
import TopicAICoach from '../../../../../components/common/TopicAICoach';
import { makeStyles } from '../styles';
import BookPane from './BookPane';

export default function AskTab({
  topic,
  chapter,
  grade,
  subject,
  curriculum,
  chapterIndex,
  colors,
  styles,
  onReadFullBook,
}: {
  topic: any;
  chapter: any;
  grade: string;
  subject: string;
  curriculum: string;
  chapterIndex: number;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  onReadFullBook: () => void;
}) {
  const hasRealPdf = Platform.OS === 'web' && !!topic.pdfFile && !!topic.pdfPage;
  return (
    <View style={styles.dualPane}>
      <View style={[hasRealPdf ? styles.leftPane : styles.leftPaneFull, { padding: spacing.xl }]}>
        <View style={[styles.contextPill, { backgroundColor: colors.primary + '18', marginBottom: 10 }]}>
          <Feather name="zap" size={11} color={colors.primary} />
          <Text style={[styles.contextPillText, { color: colors.primary }]}>
            Context loaded: {grade} · {subject} · Unit {chapterIndex + 1} · {topic.name}
          </Text>
        </View>
        <TopicAICoach
          topic={topic.name}
          subject={subject}
          grade={grade}
          curriculum={curriculum}
          chapter={chapter.title}
          autoOpen
          inline
        />
      </View>

      {hasRealPdf && (
        <BookPane topic={topic} grade={grade} subject={subject} colors={colors} styles={styles} onReadFullBook={onReadFullBook} />
      )}
    </View>
  );
}
