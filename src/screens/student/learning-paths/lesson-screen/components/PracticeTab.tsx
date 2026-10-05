import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { makeStyles } from '../styles';

export default function PracticeTab({
  topic,
  grade,
  subject,
  curriculum,
  chapterIndex,
  topicIndex,
  topicId,
  colors,
  styles,
  navigation,
  locked = false,
  onGoTo,
}: {
  topic: any;
  grade: string;
  subject: string;
  curriculum: string;
  chapterIndex: number;
  topicIndex: number;
  topicId: string | undefined;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  navigation: any;
  locked?: boolean;
  onGoTo?: (mode: 'read' | 'listen') => void;
}) {
  if (locked) {
    return (
      <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Feather name="lock" size={16} color={colors.textMuted} />
          <Text style={[styles.introText, { color: colors.textMain }]}>Practice — {topic.name}</Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textMuted }]}>
          Practice unlocks after you read Learn to the end, or listen to the whole lesson.
        </Text>
        <Text style={[styles.bodyText, { color: colors.textMuted, marginBottom: 16 }]}>
          The topic is marked done when you pass this Practice test (60% or more).
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.practiceBtn, { backgroundColor: colors.accentGreen }]} onPress={() => onGoTo?.('read')} activeOpacity={0.85}>
            <Feather name="book-open" size={15} color="#fff" />
            <Text style={styles.practiceBtnText}>Go to Learn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.practiceBtn, { backgroundColor: colors.accentGreen }]} onPress={() => onGoTo?.('listen')} activeOpacity={0.85}>
            <Feather name="headphones" size={15} color="#fff" />
            <Text style={styles.practiceBtnText}>Go to Listen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.cardDark }]}>
      <Text style={[styles.introText, { color: colors.textMain }]}>Practice — {topic.name}</Text>
      <Text style={[styles.bodyText, { color: colors.textMuted, marginBottom: 16 }]}>
        Questions are generated from this topic only, not the whole chapter.
      </Text>
      <TouchableOpacity
        style={[styles.practiceBtn, { backgroundColor: colors.accentGreen }]}
        onPress={() => navigation.navigate('Quiz', {
          topic: topic.name, grade, subject, curriculum,
          // Lets the quiz endpoint prefer the book's own grounded
          // exercises stored for this topic over LLM-generated ones.
          topicId,
          // Ground the quiz in the REAL lesson text (not just the topic name) —
          // without this the quiz LLM had nothing to go on but "Change of Heart"
          // as a bare string, and produced unrelated filler questions (a math
          // word problem lifted straight from the generic prompt's own example).
          passageText: (topic as any).readText
            ? `${(topic as any).readText.intro} ${(topic as any).readText.body?.join(' ') ?? ''}`.trim()
            : undefined,
          // So the quiz's back button returns here instead of the old
          // SubjectTopics list — it only knew that one hardcoded target before.
          returnTo: 'LessonScreen',
          returnParams: { subject, curriculum, grade, chapterIndex, topicIndex },
        })}
        activeOpacity={0.85}
      >
        <Feather name="play-circle" size={15} color="#fff" />
        <Text style={styles.practiceBtnText}>Start Practice</Text>
      </TouchableOpacity>
    </View>
  );
}
