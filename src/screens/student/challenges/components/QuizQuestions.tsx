import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Question } from '../types';

interface Props {
  questions: Question[];
  answers: (string | null)[];
  setAnswers: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  allAnswered: boolean;
  quizSubmitting: boolean;
  onSubmit: () => void;
  styles: any;
  colors: AppColors;
}

export default function QuizQuestions({ questions, answers, setAnswers, allAnswered, quizSubmitting, onSubmit, styles, colors }: Props) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.questionsContent}>
      {questions.map((q, qi) => (
        <View key={qi} style={styles.questionBlock}>
          <Text style={styles.questionNum}>Q{qi + 1} of {questions.length}</Text>
          <Text style={styles.questionText}>{q.question}</Text>
          {q.type === 'fill_blank' || q.type === 'open_ended' ? (
            <TextInput
              style={[styles.textAnswerInput, { color: colors.textMain, borderColor: colors.borderColor, backgroundColor: colors.bgDark }]}
              placeholder={q.type === 'fill_blank' ? 'Type your answer...' : 'Write your answer here...'}
              placeholderTextColor={colors.textDim}
              value={answers[qi] ?? ''}
              onChangeText={(text) => setAnswers(prev => prev.map((a, i) => i === qi ? text : a))}
              multiline={q.type === 'open_ended'}
              numberOfLines={q.type === 'open_ended' ? 4 : 1}
            />
          ) : (
            <View style={styles.optionsGrid}>
              {q.options.map((opt, oi) => (
                <TouchableOpacity
                  key={oi}
                  style={[
                    styles.optionBtn,
                    answers[qi] === opt && { backgroundColor: colors.accentYellow + '20', borderColor: colors.accentYellow },
                  ]}
                  onPress={() => setAnswers(prev => prev.map((a, i) => i === qi ? opt : a))}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionDot, answers[qi] === opt && { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow }]} />
                  <Text style={[styles.optionText, answers[qi] === opt && { color: colors.accentYellow, fontWeight: '600' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
      <TouchableOpacity
        style={[styles.submitQuizBtn, !allAnswered && { opacity: 0.5 }]}
        onPress={onSubmit}
        disabled={!allAnswered || quizSubmitting}
        activeOpacity={0.85}
      >
        {quizSubmitting ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Feather name="send" size={15} color="white" />
            <Text style={styles.submitQuizBtnText}>Submit Answers</Text>
          </>
        )}
      </TouchableOpacity>
      {!allAnswered && (
        <Text style={styles.answerAllHint}>Answer all questions to submit</Text>
      )}
    </ScrollView>
  );
}
