import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { useTopicAttempts } from '../hooks/useTopicAttempts';
import { secondsLabel } from '../utils/formatters';

interface Props {
  colors: AppColors;
  studentId: string;
  studentName: string;
  topic: string;
  onClose: () => void;
}

export default function AttemptDrawer({ colors, studentId, studentName, topic, onClose }: Props) {
  const { attempts, loading, error } = useTopicAttempts(studentId, topic);

  return (
    <View
      testID="attempt-drawer"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.cardDark,
        borderTopWidth: 1, borderColor: colors.borderColor, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16,
        maxHeight: '60%',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain, flex: 1 }} numberOfLines={1}>
          Every attempt — {studentName} — {topic}
        </Text>
        <TouchableOpacity testID="attempt-drawer-close" onPress={onClose}>
          <Feather name="x" size={20} color={colors.textMain} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accentYellow} />
      ) : error ? (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Could not load attempt history.</Text>
      ) : attempts.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>No attempts recorded for this topic yet.</Text>
      ) : (
        <ScrollView>
          <View style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, padding: 8 }}>
              {['Attempt #', 'Score', 'Correct', 'Mistakes', 'Time', 'When'].map((h) => (
                <Text key={h} style={{ flex: 1, fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{h}</Text>
              ))}
            </View>
            {attempts.map((a) => (
              <View key={a.attemptNumber} testID={`attempt-row-${a.attemptNumber}`} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor + '80', padding: 8 }}>
                <Text style={{ flex: 1, fontSize: 11, color: colors.textMain }}>{a.attemptNumber}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: a.passed ? '#4CAF50' : '#F44336' }}>{a.score != null ? `${a.score}%` : '—'}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: colors.textMain }}>{a.correctAnswers != null && a.totalQuestions != null ? `${a.correctAnswers}/${a.totalQuestions}` : '—'}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: colors.textMain }}>{a.mistakes ?? '—'}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: colors.textMain }}>{secondsLabel(a.timeSpentSeconds)}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: colors.textMain }}>{a.date ? new Date(a.date).toLocaleDateString() : '—'}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
