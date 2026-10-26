import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../../../components/common/Header';
import ScreenLayout from '../../../../../components/common/ScreenLayout';
import Confetti from '../../../../../components/common/Confetti';
import TrophyIcon from '../../../../../components/common/TrophyIcon';
import type { AppColors } from '../../../../../theme';
import { useResponsive } from '../../../../../hooks/useResponsive';
import type { NextTopic } from '../hooks/useNextTopic';
import { makeStyles } from '../styles';

export default function QuizResult({
  topic,
  score,
  questions,
  perQuestionResults,
  resultExplanations,
  explanationsRef,
  attemptNumber,
  quizStartTime,
  colors,
  isDark,
  styles,
  onRetry,
  onBack,
  onMenuPress,
  nextTopic,
  nextTopicLoading,
  onNextTopic,
}: {
  topic: string;
  score: number;
  questions: { question: string }[];
  perQuestionResults: any[];
  resultExplanations: Record<number, string>;
  explanationsRef: React.MutableRefObject<Record<number, string>>;
  attemptNumber: number;
  quizStartTime: number;
  colors: AppColors;
  isDark: boolean;
  styles: ReturnType<typeof makeStyles>;
  onRetry: () => void;
  onBack: () => void;
  onMenuPress: () => void;
  nextTopic?: NextTopic | null;
  nextTopicLoading?: boolean;
  onNextTopic?: (next: NextTopic) => void;
}) {
  const accent = colors.accentYellow;
  const gold = colors.accentYellow;
  const pct = Math.round((score / questions.length) * 100);
  const passed = pct >= 60;
  // Freeze the elapsed time at first render of the result screen instead of
  // recomputing Date.now() on every render (which would make the displayed
  // time keep ticking upward while the results are just being read).
  const [resultShownAt] = React.useState(() => Date.now());
  const totalTime = Math.round((resultShownAt - quizStartTime) / 1000);
  const timeStr = totalTime >= 60 ? `${Math.floor(totalTime / 60)}m ${totalTime % 60}s` : `${totalTime}s`;
  const scoreColor = pct >= 60 ? gold : '#C98A8A';
  const trophyTier: 'gold' | 'silver' | 'bronze' = pct >= 80 ? 'gold' : pct >= 60 ? 'silver' : 'bronze';
  const message = pct === 100 ? 'Perfect score! Outstanding work!'
    : pct >= 80 ? 'Excellent! You really understand this topic!'
    : pct >= 60 ? 'Good job! A little more practice and you will master this!'
    : 'Keep going! Review what you missed below and try again.';

  const { isMobile } = useResponsive();
  // Two columns of question cards on wider screens; cards in a row share the taller one's height.
  const cardWidth = isMobile ? '100%' : '49.2%';
  const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'space-between' as const, alignItems: 'stretch' as const };

  // Soft pulsing glow on the Next topic button.
  const [glow] = React.useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!passed || !nextTopic) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [passed, nextTopic, glow]);

  const correctQs = perQuestionResults.filter(r => r.isCorrect);
  const wrongQs = perQuestionResults.map((r, i) => ({ ...r, idx: i })).filter(r => !r.isCorrect);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title="Practice Results" showBack onBack={onBack} onMenuPress={onMenuPress} />
        <ScrollView contentContainerStyle={[styles.scrollContent]} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { alignItems: 'center', paddingTop: 32 }]}>

          {/* ── Score hero ── */}
          {passed && <Confetti trigger />}
          <TrophyIcon size={96} tier={trophyTier} />
          <Text style={[styles.resultScore, { color: scoreColor, marginTop: 12 }]}>{pct}%</Text>
          <Text style={[styles.resultLabel, { color: colors.textMain }]}>{score} / {questions.length} correct</Text>
          <Text style={[styles.resultMessage, { color: colors.textMuted }]}>{message}</Text>

          {/* badges */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <View style={[styles.topicBadge, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
              <Text style={[styles.topicBadgeText, { color: accent }]}>{topic}</Text>
            </View>
            <View style={[styles.topicBadge, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
              <Feather name="clock" size={11} color={colors.textMuted} />
              <Text style={[styles.topicBadgeText, { color: colors.textMuted }]}> {timeStr}</Text>
            </View>
            {attemptNumber > 1 && (
              <View style={[styles.topicBadge, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>
                <Text style={[styles.topicBadgeText, { color: colors.textMuted }]}>Attempt #{attemptNumber}</Text>
              </View>
            )}
          </View>

          {/* action buttons */}
          <View style={styles.resultBtns}>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: !passed ? '#C98A8A' : accent, backgroundColor: !passed ? '#C98A8A14' : accent + '14' }]}
              onPress={onRetry} activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={16} color={!passed ? '#C98A8A' : accent} />
              <Text style={[styles.retryBtnText, { color: !passed ? '#C98A8A' : accent }]}>
                {!passed ? 'Retake (New Questions)' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>

          {passed && nextTopic && onNextTopic && (
            <Animated.View style={{
              width: '100%', marginTop: 12, borderRadius: 14,
              shadowColor: gold, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.8] }) as any,
              shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }) as any,
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
            }}>
              <TouchableOpacity
                testID="quiz-next-topic"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18 }}
                onPress={() => onNextTopic(nextTopic)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0B0B0BAA', letterSpacing: 0.6 }}>NEXT TOPIC</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0B0B0B' }} numberOfLines={1}>{nextTopic.name}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#0B0B0BAA' }} numberOfLines={1}>{nextTopic.chapterTitle}</Text>
                </View>
                <Feather name="arrow-right" size={20} color="#0B0B0B" />
              </TouchableOpacity>
            </Animated.View>
          )}
          {passed && !nextTopic && !nextTopicLoading && onNextTopic && (
            <Text testID="quiz-subject-finished" style={{ marginTop: 12, fontSize: 13, fontWeight: '700', color: gold, textAlign: 'center' }}>
              That was the last topic in this subject. Well done!
            </Text>
          )}
          {!passed && (
            <View testID="quiz-next-locked" style={{ width: '100%', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark }}>
              <Feather name="lock" size={16} color={colors.textMuted} />
              <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
                Score 60% or more to unlock the next topic. Look at the mistakes below, then retake.
              </Text>
            </View>
          )}
        </View>

        <View style={{ width: '100%', maxWidth: 1040, alignSelf: 'center' }}>

          {/* ── What you got RIGHT ── */}
          {correctQs.length > 0 && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionHeader}>
                <View style={[styles.reviewSectionIcon, { backgroundColor: '#9FB2A420' }]}>
                  <Feather name="check-circle" size={16} color="#9FB2A4" />
                </View>
                <Text style={[styles.reviewSectionTitle, { color: colors.accentGreen }]}>
                  Questions You Got Right ({correctQs.length})
                </Text>
              </View>
              <View style={grid}>
              {correctQs.map((r, i) => (
                <View key={i} testID="quiz-review-card" style={[styles.reviewCard, { width: cardWidth }, {
                  backgroundColor: colors.cardDark,
                  borderColor: '#9FB2A430',
                  borderLeftColor: '#9FB2A4',
                }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#9FB2A420', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Feather name="check" size={13} color="#9FB2A4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMain, lineHeight: 22 }}>{r.question}</Text>
                      <View style={[styles.reviewAnswerRow, { backgroundColor: colors.bgDark, borderRadius: 8, marginTop: 10 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentGreen, width: 90, letterSpacing: 0.3 }}>Your answer</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.accentGreen }}>{r.studentAnswer}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              </View>
            </View>
          )}

          {/* ── What you got WRONG ── */}
          {wrongQs.length > 0 && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionHeader}>
                <View style={[styles.reviewSectionIcon, { backgroundColor: '#C5BD9620' }]}>
                  <Feather name="x-circle" size={16} color="#C5BD96" />
                </View>
                <Text style={[styles.reviewSectionTitle, { color: '#C5BD96' }]}>
                  Questions You Got Wrong ({wrongQs.length})
                </Text>
              </View>
              <View style={grid}>
              {wrongQs.map((r) => {
                const expl = resultExplanations[r.idx];
                return (
                  <View key={r.idx} testID="quiz-review-card" style={[styles.reviewCard, { width: cardWidth }, {
                    backgroundColor: colors.cardDark,
                    borderColor: '#C5BD9630',
                    borderLeftColor: '#C5BD96',
                  }]}>
                    {/* question */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#C5BD9620', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Feather name="x" size={13} color="#C5BD96" />
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.textMain, lineHeight: 22 }}>{r.question}</Text>
                    </View>

                    {/* your answer vs correct answer */}
                    <View style={{ gap: 7, marginBottom: 14, marginLeft: 36 }}>
                      <View style={[styles.reviewAnswerRow, { backgroundColor: colors.bgDark, borderRadius: 8 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#C9A24E', width: 100, letterSpacing: 0.3 }}>Your answer</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#C9A24E' }}>{r.studentAnswer || '—'}</Text>
                      </View>
                      <View style={[styles.reviewAnswerRow, { backgroundColor: colors.bgDark, borderRadius: 8 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#C5BD96', width: 100, letterSpacing: 0.3 }}>Correct answer</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#C5BD96' }}>{r.correctAnswer}</Text>
                      </View>
                    </View>

                    {/* Aivorah explanation */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, backgroundColor: isDark ? '#171612' : '#F8F6ED', borderWidth: 1, borderColor: '#C5BD9625' }}>
                      {expl ? (
                        <>
                          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#C5BD9620', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Feather name="book-open" size={12} color="#C5BD96" />
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: colors.textMain, lineHeight: 21 }}>
                            <Text style={{ fontWeight: '800', color: '#C5BD96' }}>Aivorah: </Text>{expl}
                          </Text>
                        </>
                      ) : (
                        <>
                          <ActivityIndicator size="small" color="#C5BD96" />
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>Aivorah is preparing your explanation…</Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
              </View>
            </View>
          )}

        </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
