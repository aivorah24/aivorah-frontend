import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../../../components/common/Header';
import ScreenLayout from '../../../../../components/common/ScreenLayout';
import TransliterationInput, { resolveTypingLang } from '../../../../../components/common/TransliterationInput';
import type { AppColors } from '../../../../../theme';
import { SUBJECT_ICON } from '../constants';
import { makeStyles } from '../styles';
import type { Question } from '../types';

export default function QuizQuestion({
  q,
  currentQ,
  questions,
  topic,
  subject,
  colors,
  isDark,
  styles,
  mcqSelected,
  mcqDone,
  showMcqHint,
  fillInput,
  setFillInput,
  fillFeedback,
  fillValidating,
  explanation,
  loadingExplain,
  onMcqAnswer,
  onFillSubmit,
  onNext,
  onPrev,
  onBack,
  onMenuPress,
}: {
  q: Question;
  currentQ: number;
  questions: Question[];
  topic: string;
  subject: string;
  colors: AppColors;
  isDark: boolean;
  styles: ReturnType<typeof makeStyles>;
  mcqSelected: number | null;
  mcqDone: boolean;
  showMcqHint: boolean;
  fillInput: string;
  setFillInput: (s: string) => void;
  fillFeedback: 'idle' | 'wrong1' | 'wrong2' | 'revealed' | 'correct';
  fillValidating: boolean;
  explanation: string;
  loadingExplain: boolean;
  onMcqAnswer: (optIdx: number) => void;
  onFillSubmit: () => void;
  onNext: (isCorrect: boolean) => void;
  onPrev: () => void;
  onBack: () => void;
  onMenuPress: () => void;
}) {
  const accent = colors.accentYellow;
  const isFill = q.type === 'fill_blank';
  const fillDone = fillFeedback === 'correct' || fillFeedback === 'revealed';
  const mcqCorrect = mcqDone && mcqSelected === (q.correct as number);
  const showNext = isFill ? fillDone : (mcqDone && !loadingExplain);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header title={`${subject} Practice`} subtitle={topic} showBack onBack={onBack} onMenuPress={onMenuPress} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.twoPanel}>

          {/* ── LEFT PANEL: subject + progress ── */}
          <View style={[styles.leftPanel, { backgroundColor: colors.cardDark, borderRightWidth: 1, borderRightColor: colors.borderColor }]}>
            <View style={styles.leftTop}>
              <View style={[styles.subjectIcon, { backgroundColor: accent + '20', borderWidth: 1, borderColor: accent + '40' }]}>
                <Feather name={(SUBJECT_ICON[subject] || 'globe') as any} size={22} color={accent} />
              </View>
              <Text style={[styles.leftSubject, { color: accent }]}>{subject}</Text>
              <Text style={[styles.leftTopic, { color: colors.textMain }]} numberOfLines={3}>{topic}</Text>
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              {questions.map((_, i) => (
                <View key={i} style={[styles.stepDot, {
                  backgroundColor: i < currentQ ? accent : i === currentQ ? accent : colors.borderColor,
                  opacity: i < currentQ ? 0.9 : i === currentQ ? 1 : 0.35,
                  width: i === currentQ ? 22 : 8,
                }]} />
              ))}
            </View>

            <View style={styles.leftBottom}>
              <Text style={[styles.leftCounter, { color: colors.textMain }]}>{currentQ + 1}</Text>
              <Text style={[styles.leftOf, { color: colors.textMuted }]}>of {questions.length}</Text>
              <View style={[styles.leftTypeBadge, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
                <Feather name={isFill ? 'edit-3' : 'list'} size={10} color={accent} />
                <Text style={[styles.leftTypeTxt, { color: accent }]}>{isFill ? 'Fill Blank' : 'MCQ'}</Text>
              </View>
            </View>
          </View>

          {/* ── RIGHT PANEL: question + options ── */}
          <View style={[styles.rightPanel, { backgroundColor: colors.cardDark, borderColor: colors.borderColor }]}>

            {/* Question text */}
            <Text style={[styles.questionText, { color: colors.textMain }]}>{q.question}</Text>
            <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />

          {/* ── MCQ options — inside the card ── */}
          {!isFill && (
            <View style={styles.optionsList}>
              {q.options.map((opt, i) => {
                const isSelected = mcqSelected === i;
                const isCorrect = (q.correct as number) === i;
                const LETTERS = ['A', 'B', 'C', 'D'];
                const showResult = mcqDone;

                let radioFill = 'transparent';
                let radioBorder = isDark ? '#555' : '#B8CCCA';
                let textCol = colors.textMain;
                let rowBg = 'transparent';
                let leftBorder = 'transparent';
                let resultIcon: 'check-circle' | 'x-circle' | null = null;

                const CORRECT = accent; // gold for correct
                const WRONG = '#C98A8A'; // warm amber-red for wrong
                if (showResult) {
                  if (isCorrect) { radioFill = CORRECT; radioBorder = CORRECT; textCol = CORRECT; rowBg = accent + '12'; leftBorder = CORRECT; resultIcon = 'check-circle'; }
                  else if (isSelected) { radioFill = WRONG; radioBorder = WRONG; textCol = WRONG; rowBg = isDark ? '#C98A8A12' : '#FFF6F0'; leftBorder = WRONG; resultIcon = 'x-circle'; }
                  else { radioBorder = isDark ? '#333' : '#DDD'; textCol = isDark ? '#444' : '#CCC'; }
                } else if (mcqSelected === i) {
                  radioFill = accent; radioBorder = accent; textCol = accent;
                  rowBg = accent + '14'; leftBorder = accent;
                }

                return (
                  <TouchableOpacity key={i}
                    style={[styles.optionRow, { backgroundColor: rowBg, borderLeftColor: leftBorder }]}
                    onPress={() => onMcqAnswer(i)}
                    activeOpacity={mcqSelected !== null ? 1 : 0.65}
                    disabled={mcqSelected !== null || mcqDone}
                  >
                    <View style={[styles.radioOuter, { borderColor: radioBorder }]}>
                      {radioFill !== 'transparent' && <View style={[styles.radioInner, { backgroundColor: radioFill }]} />}
                    </View>
                    <Text style={[styles.optionLetter, { color: showResult ? (isCorrect ? CORRECT : isSelected ? WRONG : isDark ? '#444' : '#DDD') : (mcqSelected === i ? accent : colors.textMuted) }]}>{LETTERS[i]}</Text>
                    <Text style={[styles.optionText, { color: textCol }]}>{opt}</Text>
                    {resultIcon && <Feather name={resultIcon} size={14} color={resultIcon === 'check-circle' ? CORRECT : WRONG} style={{ marginLeft: 'auto' as any }} />}
                  </TouchableOpacity>
                );
              })}

              {/* Hint row inside card */}
              {showMcqHint && !mcqDone && (
                <View style={[styles.hintBanner, { backgroundColor: accent + '10', borderColor: accent + '40' }]}>
                  <Feather name="zap" size={12} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hintBannerLabel}>Aivorah&apos;s Hint</Text>
                    <Text style={styles.hintBannerText}>{q.hint || 'Think carefully before your next attempt!'}</Text>
                  </View>
                  <View style={[styles.retryChip, { backgroundColor: accent + '20', borderColor: accent + '40' }]}>
                    <Feather name="refresh-cw" size={9} color={accent} />
                    <Text style={[styles.retryChipText, { color: accent }]}>retry</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Fill-in-the-blank — inside card ── */}
          {isFill && (
            <View style={styles.fillArea}>
              {fillFeedback === 'correct' ? (
                <View style={[styles.fillResultRow, { backgroundColor: accent + '12', borderColor: accent + '40' }]}>
                  <Feather name="check-circle" size={14} color={accent} />
                  <Text style={[styles.fillCorrectText, { color: accent }]}>{fillInput}</Text>
                </View>
              ) : fillFeedback === 'revealed' ? (
                <View style={[styles.fillResultRow, { backgroundColor: accent + '12', borderColor: accent + '40' }]}>
                  <Feather name="info" size={14} color={accent} />
                  <Text style={[styles.fillCorrectText, { color: accent }]}>Answer: {q.correct as string}</Text>
                </View>
              ) : (
                <>
                  <TransliterationInput
                    style={[styles.fillInput, { borderColor: fillFeedback !== 'idle' ? accent + '70' : accent + '50', color: colors.textMain, backgroundColor: isDark ? colors.bgDark : '#F8FAFA' }]}
                    placeholder="Type your answer here..."
                    placeholderTextColor={colors.textDim}
                    colors={colors}
                    value={fillInput}
                    onChangeText={setFillInput}
                    // Language-Acquisition answers: if the question is in a native
                    // script (e.g. Devanagari), let the student type it via English.
                    langCode={resolveTypingLang(subject, q.question as string, topic)}
                  />
                  {fillFeedback === 'wrong1' && (
                    <View style={styles.nudgeRow}>
                      <Feather name="alert-circle" size={12} color={accent} />
                      <Text style={[styles.nudgeText, { color: accent }]}>Not quite — give it another try!</Text>
                    </View>
                  )}
                  {fillFeedback === 'wrong2' && (
                    <View style={[styles.hintBanner, { backgroundColor: accent + '10', borderColor: accent + '40' }]}>
                      <Feather name="zap" size={12} color="#fff" />
                      <Text style={[styles.hintBannerText, { flex: 1 }]}>Hint: {q.hint || 'Think carefully!'}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.checkBtn, { backgroundColor: fillValidating || !fillInput.trim() ? accent + '45' : accent }]}
                    onPress={onFillSubmit}
                    activeOpacity={0.85}
                    disabled={fillValidating || !fillInput.trim()}
                  >
                    {fillValidating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Feather name="check" size={14} color="#fff" /><Text style={styles.checkBtnText}>Check Answer</Text></>
                    }
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Explanation row — inside card, after divider */}
          {(explanation || loadingExplain) && (
            <View style={[styles.explanationRow, { borderTopWidth: 1, borderTopColor: colors.borderColor, paddingTop: 12, marginTop: 4 }]}>
              {loadingExplain
                ? <ActivityIndicator color={accent} size="small" />
                : <>
                    <Feather name={(mcqCorrect || fillFeedback === 'correct') ? 'check-circle' : 'info'} size={13}
                      color={accent} />
                    <Text style={[styles.explanationText, { color: isDark ? colors.textMuted : '#666' }]}>
                      <Text style={{ fontWeight: '700', color: accent }}>
                        {(mcqCorrect || fillFeedback === 'correct') ? 'Well done! ' : 'Aivorah: '}
                      </Text>
                      {explanation}
                    </Text>
                  </>
              }
            </View>
          )}

          {/* Footer nav — Previous (review earlier questions) + Next */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            {currentQ > 0 ? (
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderColor }]}
                onPress={onPrev}
                activeOpacity={0.85}
              >
                <Feather name="arrow-left" size={15} color={colors.textMain} />
                <Text style={[styles.nextBtnText, { color: colors.textMain }]}>Previous</Text>
              </TouchableOpacity>
            ) : <View />}
            {showNext ? (
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: accent }]}
                onPress={() => onNext(isFill ? fillFeedback === 'correct' : mcqCorrect)}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>{currentQ < questions.length - 1 ? 'Next Question' : 'See Results'}</Text>
                <Feather name="arrow-right" size={15} color="#fff" />
              </TouchableOpacity>
            ) : <View />}
          </View>

          </View>{/* end rightPanel */}

        </View>{/* end twoPanel */}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}
