import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { QuizQuestion, QuizState } from '../types';
import { TEAL } from '../constants';

interface Props {
  quizState: QuizState;
  quizError: string;
  questions: QuizQuestion[];
  currentQ: number;
  selected: number | null;
  answered: boolean;
  correctCount: number;
  xpEarned: number;
  isDark: boolean;
  colors: AppColors;
  styles: any;
  onStart: () => void;
  onAnswer: (idx: number) => void;
}

export default function QuizSection({
  quizState, quizError, questions, currentQ, selected, answered, correctCount, xpEarned,
  isDark, colors, styles, onStart, onAnswer,
}: Props) {
  const mutedColor = colors.textMuted;
  const titleColor = isDark ? colors.textMain : '#1C2A28';

  if (quizState === 'idle') {
    return (
      <View>
        <TouchableOpacity
          style={[styles.quizBtn, { backgroundColor: TEAL }]}
          onPress={onStart}
          activeOpacity={0.85}
        >
          <Feather name="check-square" size={13} color="#fff" />
          <Text style={styles.quizBtnText}>Test Your Knowledge</Text>
        </TouchableOpacity>
        {!!quizError && (
          <Text style={[styles.quizLoadText, { color: '#C85870', marginTop: 4 }]}>{quizError}</Text>
        )}
      </View>
    );
  }

  if (quizState === 'loading') {
    return (
      <View style={styles.quizLoadRow}>
        <ActivityIndicator size="small" color={TEAL} />
        <Text style={[styles.quizLoadText, { color: mutedColor }]}>Generating quiz...</Text>
      </View>
    );
  }

  if (quizState === 'already_done') {
    return (
      <View style={[styles.quizDoneBanner, { backgroundColor: TEAL + '15', borderColor: TEAL + '35' }]}>
        <View style={[styles.quizDoneIcon, { backgroundColor: TEAL + '25' }]}>
          <Feather name="check-circle" size={13} color={TEAL} />
        </View>
        <Text style={[styles.quizDoneText, { color: TEAL }]}>Quiz done today! Come back tomorrow.</Text>
      </View>
    );
  }

  if (quizState === 'active' && questions[currentQ]) {
    return (
      <View style={[styles.quizBox, { backgroundColor: isDark ? colors.bgDark : '#f5f9f8', borderColor: TEAL + '40' }]}>
        <Text style={[styles.quizCounter, { color: mutedColor }]}>
          Question {currentQ + 1} of {questions.length}
        </Text>
        <Text style={[styles.quizQuestion, { color: titleColor }]}>{questions[currentQ].question}</Text>
        <View style={styles.optionsCol}>
          {questions[currentQ].options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect  = i === questions[currentQ].correct;
            let bg = isDark ? colors.cardDark : '#fff';
            let border = TEAL + '40';
            if (answered) {
              if (isCorrect)      { bg = '#4A9E7018'; border = '#4A9E7080'; }
              else if (isSelected) { bg = '#C8587018'; border = '#C8587080'; }
            } else if (isSelected) {
              bg = TEAL + '18'; border = TEAL;
            }
            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                onPress={() => onAnswer(i)}
                activeOpacity={0.8}
                disabled={answered}
              >
                <View style={[styles.optionIdx, { backgroundColor: TEAL + '20' }]}>
                  <Text style={[styles.optionIdxText, { color: TEAL }]}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={[styles.optionText, { color: titleColor }]}>{opt}</Text>
                {answered && isCorrect && <Feather name="check" size={13} color="#4A9E70" />}
                {answered && isSelected && !isCorrect && <Feather name="x" size={13} color="#C85870" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (quizState === 'done') {
    return (
      <View style={[styles.quizDoneBanner, { backgroundColor: TEAL + '15', borderColor: TEAL + '35' }]}>
        <View style={[styles.quizDoneIcon, { backgroundColor: TEAL + '25' }]}>
          <Feather name="award" size={14} color={TEAL} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.quizDoneTitle, { color: TEAL }]}>
            {correctCount === questions.length ? 'Perfect score!' : `${correctCount}/${questions.length} correct`}
          </Text>
          {xpEarned > 0 && (
            <Text style={[styles.quizXpText, { color: mutedColor }]}>+{xpEarned} XP earned</Text>
          )}
        </View>
      </View>
    );
  }

  return null;
}
