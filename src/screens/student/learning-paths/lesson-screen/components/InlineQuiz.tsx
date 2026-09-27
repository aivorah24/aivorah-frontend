import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';

export type QuizQuestion = { question: string; options: string[]; correctIndex: number; explanation?: string; page?: number };

// Practice from the book: one question at a time, instant feedback with the book's explanation, a score at the end.
export default function InlineQuiz({ questions, colors }: { questions: QuizQuestion[]; colors: AppColors }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const gold = colors.accentYellow;

  if (done) {
    return (
      <View testID="quiz-result" style={{ gap: 12, alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textMain }}>You scored {score} of {questions.length}</Text>
        <Text style={{ fontSize: 15, color: colors.textMuted }}>
          {score === questions.length ? 'Excellent! You know this part well.' : score >= questions.length / 2 ? 'Good work. Read the explanations for the ones you missed.' : 'Read this part in Learn once more, then try again.'}
        </Text>
        <TouchableOpacity testID="quiz-retry" onPress={() => { setIndex(0); setPicked(null); setScore(0); setDone(false); }}
          style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 22, backgroundColor: gold }}>
          <Feather name="rotate-ccw" size={15} color={colors.bgDark} />
          <Text style={{ color: colors.bgDark, fontWeight: '800' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = questions[index];
  const answered = picked !== null;
  const next = () => {
    if (index + 1 >= questions.length) setDone(true);
    else { setIndex(index + 1); setPicked(null); }
  };

  return (
    <View testID="inline-quiz" style={{ gap: 12 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: gold, letterSpacing: 0.6 }}>QUESTION {index + 1} OF {questions.length}</Text>
      <Text style={{ fontSize: 17, lineHeight: 25, fontWeight: '700', color: colors.textMain }}>{q.question}</Text>
      {q.options.map((opt, i) => {
        const right = answered && i === q.correctIndex;
        const wrong = answered && i === picked && i !== q.correctIndex;
        return (
          <TouchableOpacity
            key={i}
            testID={`quiz-option-${i}`}
            disabled={answered}
            onPress={() => { setPicked(i); if (i === q.correctIndex) setScore((s) => s + 1); }}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5,
              borderColor: right ? '#3AA26A' : wrong ? '#D65C5C' : colors.borderColor,
              backgroundColor: right ? '#3AA26A1a' : wrong ? '#D65C5C14' : colors.cardDark,
            }}
          >
            <Text style={{ width: 22, fontWeight: '800', color: colors.textMuted }}>{String.fromCharCode(65 + i)}</Text>
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.textMain }}>{opt}</Text>
            {right && <Feather name="check-circle" size={18} color="#3AA26A" />}
            {wrong && <Feather name="x-circle" size={18} color="#D65C5C" />}
          </TouchableOpacity>
        );
      })}
      {answered && (
        <View testID="quiz-feedback" style={{ gap: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: picked === q.correctIndex ? '#3AA26A' : '#D65C5C' }}>
            {picked === q.correctIndex ? 'Correct!' : `Not quite. The answer is ${String.fromCharCode(65 + q.correctIndex)}.`}
          </Text>
          {!!q.explanation && <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.textMain }}>{q.explanation}{q.page ? ` (Book page ${q.page})` : ''}</Text>}
          <TouchableOpacity testID="quiz-next" onPress={next} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 22, backgroundColor: gold }}>
            <Text style={{ color: colors.bgDark, fontWeight: '800' }}>{index + 1 >= questions.length ? 'See my score' : 'Next question'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
