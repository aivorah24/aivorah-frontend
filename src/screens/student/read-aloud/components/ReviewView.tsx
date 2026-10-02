import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { AssessResult, WordStatus } from '../types';
import { RESULT_META, STATUS_COLORS } from '../utils/levelMeta';
import type { ReadAloudStyles } from './styles';

interface Props {
  s: ReadAloudStyles;
  colors: AppColors;
  result: AssessResult | null;
  words: string[];
  wordStatuses: WordStatus[];
  starsEarned: number;
  onTryAgain: () => void;
  onNewPassage: () => void;
}

const MAX_ERRORS_SHOWN = 10;

// Score, feedback, the passage coloured by word status, and words to practise.
export default function ReviewView({ s, colors, result, words, wordStatuses, starsEarned, onTryAgain, onNewPassage }: Props) {
  const rc = RESULT_META[result?.level || 'developing'] || RESULT_META.developing;
  const stats = [
    { icon: 'check-circle', color: STATUS_COLORS.correct, value: result?.correct ?? 0, label: 'Correct' },
    { icon: 'x-circle', color: STATUS_COLORS.misread, value: result?.misread ?? 0, label: 'Misread' },
    { icon: 'skip-forward', color: STATUS_COLORS.skipped, value: result?.skipped ?? 0, label: 'Skipped' },
    { icon: 'clock', color: '#C3DCD8', value: result?.wcpm ?? 0, label: 'WPM' },
  ] as const;
  const lexileChange = result?.lexileChange ?? 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <LinearGradient colors={[rc.ring + '12', 'transparent']} style={[s.scoreCard, { borderColor: rc.ring + '30' }]}>
        {result ? (
          <View style={[s.scoreRing, { borderColor: rc.ring }]}>
            <Text style={[s.scoreNum, { color: rc.ring }]} testID="read-aloud-accuracy">{result.accuracy ?? 0}%</Text>
          </View>
        ) : (
          <View style={[s.scoreRing, { borderColor: colors.borderColor }]}>
            <ActivityIndicator color={colors.accentYellow} />
          </View>
        )}
        {result ? <Text style={[s.scoreLabel, { color: rc.ring }]}>{rc.label}</Text> : null}

        <View style={s.statsRow}>
          {stats.map((st) => (
            <View key={st.label} style={s.statItem}>
              <Feather name={st.icon} size={16} color={st.color} />
              <Text style={[s.statNum, { color: colors.textMain }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: colors.textDim }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.badgeRow}>
          {starsEarned > 0 && (
            <View style={[s.badge, { backgroundColor: '#FFD70020' }]}>
              <Feather name="star" size={18} color="#FFD700" />
              <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 16, marginLeft: 6 }}>+{starsEarned}</Text>
              <Text style={{ color: colors.textDim, fontSize: 11, marginLeft: 4 }}>stars</Text>
            </View>
          )}
          {result?.lexile != null && (
            <View style={[s.badge, { backgroundColor: colors.accentYellow + '15' }]}>
              <Feather name="bar-chart-2" size={14} color={colors.accentYellow} />
              <Text style={{ color: colors.accentYellow, fontWeight: '700', fontSize: 13, marginLeft: 6 }}>Lexile {result.lexile}L</Text>
              {lexileChange !== 0 && (
                <Text style={{ color: lexileChange > 0 ? STATUS_COLORS.correct : STATUS_COLORS.misread, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>
                  {lexileChange > 0 ? '+' : ''}{lexileChange}
                </Text>
              )}
            </View>
          )}
        </View>
      </LinearGradient>

      {result?.feedback ? (
        <View style={[s.feedbackCard, { borderColor: colors.borderColor + '30' }]}>
          <View style={[s.feedbackIconCircle, { backgroundColor: colors.accentYellow + '15' }]}>
            <Feather name="message-circle" size={14} color={colors.accentYellow} />
          </View>
          <Text style={[s.feedbackText, { color: colors.textMain }]}>{result.feedback}</Text>
        </View>
      ) : null}

      <Text style={[s.sectionTitle, { color: colors.textDim, marginTop: 16 }]}>Your Reading</Text>
      <View style={[s.textCard, { borderColor: colors.borderColor + '30' }]}>
        <Text style={s.readingText}>
          {words.map((w, i) => {
            const status = wordStatuses[i];
            const color = status === 'correct' || status === 'misread' || status === 'skipped' ? STATUS_COLORS[status] : colors.textDim;
            return (
              <Text
                key={i}
                style={{ color, fontWeight: status !== 'pending' ? '600' : '400', textDecorationLine: status === 'misread' ? 'underline' : 'none', fontSize: 18, lineHeight: 32 }}
              >
                {w}{' '}
              </Text>
            );
          })}
        </Text>
      </View>

      {!!result?.errors?.length && (
        <View style={{ marginTop: 12 }}>
          <Text style={[s.sectionTitle, { color: colors.textDim }]}>Words to Practice</Text>
          {result.errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => {
            const misread = e.type === 'misread';
            return (
              <View key={i} style={[s.errorRow, { borderColor: colors.borderColor + '20' }]}>
                <View style={[s.errorBadge, { backgroundColor: (misread ? STATUS_COLORS.misread : STATUS_COLORS.skipped) + '20' }]}>
                  <Text style={{ fontSize: 10, color: misread ? STATUS_COLORS.misread : STATUS_COLORS.skipped, fontWeight: '700' }}>{misread ? 'Misread' : 'Skipped'}</Text>
                </View>
                <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '600', flex: 1 }}>{e.word}</Text>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>word #{e.position}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={[s.actionRow, { marginTop: 20, marginBottom: 40 }]}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.cardDark, borderColor: colors.borderColor + '40' }]} onPress={onTryAgain} activeOpacity={0.7} accessibilityRole="button">
          <Feather name="rotate-ccw" size={16} color={colors.accentYellow} />
          <Text style={{ color: colors.accentYellow, fontWeight: '600', fontSize: 14 }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.primaryBtn, { backgroundColor: colors.accentYellow }]} onPress={onNewPassage} activeOpacity={0.7} accessibilityRole="button">
          <Feather name="book-open" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>New Passage</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
