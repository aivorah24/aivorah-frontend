import React from 'react';
import { View, Text, Modal, ActivityIndicator } from 'react-native';
import type { AppColors } from '../../../../theme';
import type { Challenge, Question } from '../types';
import QuizHeader from './QuizHeader';
import QuizQuestions from './QuizQuestions';
import QuizResult from './QuizResult';

interface Props {
  visible: boolean;
  activeChallenge: Challenge | null;
  questions: Question[];
  answers: (string | null)[];
  setAnswers: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  quizLoading: boolean;
  quizSubmitting: boolean;
  quizResult: { score: number; xpAwarded: number } | null;
  timeLeft: number | null;
  allAnswered: boolean;
  leaderboard: any[];
  leaderLoading: boolean;
  studentId: string | undefined;
  grade: string;
  onSubmit: () => void;
  onClose: () => void;
  styles: any;
  colors: AppColors;
}

export default function QuizModal({
  visible, activeChallenge, questions, answers, setAnswers,
  quizLoading, quizSubmitting, quizResult, timeLeft, allAnswered,
  leaderboard, leaderLoading, studentId, grade,
  onSubmit, onClose, styles, colors,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.quizOverlay}>
        <View style={styles.quizSheet}>
          <QuizHeader
            activeChallenge={activeChallenge}
            questionCount={questions.length}
            timeLeft={timeLeft}
            hasResult={!!quizResult}
            onClose={onClose}
            colors={colors}
          />

          {quizLoading ? (
            <View style={styles.quizLoading}>
              <ActivityIndicator size="large" color={colors.accentYellow} />
              <Text style={styles.quizLoadingText}>Loading questions...</Text>
            </View>
          ) : quizResult ? (
            <QuizResult
              quizResult={quizResult}
              leaderboard={leaderboard}
              leaderLoading={leaderLoading}
              studentId={studentId}
              grade={grade}
              onDone={onClose}
              styles={styles}
              colors={colors}
            />
          ) : (
            <QuizQuestions
              questions={questions}
              answers={answers}
              setAnswers={setAnswers}
              allAnswered={allAnswered}
              quizSubmitting={quizSubmitting}
              onSubmit={onSubmit}
              styles={styles}
              colors={colors}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
