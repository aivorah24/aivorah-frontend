import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import type { Assignment } from '../types';

// ── Interactive Quiz Modal (from PDF→Gemini pipeline) — iframe on web, ──
// WebView on native, so the Submit flow works on the mobile app too.
export function InteractiveQuizModal({
  assignment, studentId, quizProgress, setQuizProgress, submittingQuiz, setSubmittingQuiz,
  onClose, onSubmitted,
}: {
  assignment: Assignment;
  studentId: string | null | undefined;
  quizProgress: { pct: number; completed: boolean; correct: number; total: number; attemptedCount: number; answers: any[] } | null;
  setQuizProgress: (p: any) => void;
  submittingQuiz: boolean;
  setSubmittingQuiz: (b: boolean) => void;
  onClose: () => void;
  onSubmitted: (updated: any) => void;
}) {
  const html = assignment.interactiveQuizHtml!;
  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      {/* The quiz HTML inside the iframe is always dark-themed — pin the modal
          chrome to the same dark palette so light mode doesn't show a white bar */}
      <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
        {/* Header bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(195,220,216,0.15)', backgroundColor: '#141414' }}>
          <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={22} color="#F0EEEC" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F0EEEC', fontSize: 16, fontWeight: '700' }}>{assignment.title}</Text>
            <Text style={{ color: '#BAA467', fontSize: 12, marginTop: 2 }}>Interactive Quiz</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: 'rgba(195,220,216,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="x" size={18} color="#F0EEEC" />
          </TouchableOpacity>
        </View>
        {/* Quiz content */}
        {Platform.OS === 'web' ? (
        <View
          style={{ flex: 1 } as any}
          ref={(el: any) => {
            if (el && !(el as any)._done) {
              (el as any)._done = true;
              setQuizProgress(null);
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const f = document.createElement('iframe');
              f.src = url;
              f.style.cssText = 'width:100%;height:100%;border:none;display:block;';
              f.title = 'Interactive Quiz';
              f.onload = () => URL.revokeObjectURL(url);
              el.appendChild(f);

              // Track live progress from the quiz iframe — the student confirms
              // via the Submit Assignment button below rather than this firing
              // the submission automatically.
              const onMsg = (e: MessageEvent) => {
                if (e.data?.type === 'quiz-score') {
                  const pct = e.data.pct ?? Math.round((e.data.correct / e.data.total) * 100);
                  setQuizProgress({ pct, completed: !!e.data.completed, correct: e.data.correct, total: e.data.total, attemptedCount: e.data.attemptedCount ?? e.data.correct, answers: e.data.answers || [] });
                }
              };
              window.addEventListener('message', onMsg);
            }
          }}
        />
        ) : (
        <WebView
          source={{ html }}
          style={{ flex: 1, backgroundColor: '#0F0F0F' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data?.type === 'quiz-score') {
                const pct = data.pct ?? Math.round((data.correct / data.total) * 100);
                setQuizProgress({ pct, completed: !!data.completed, correct: data.correct, total: data.total, attemptedCount: data.attemptedCount ?? data.correct, answers: data.answers || [] });
              }
            } catch { /* ignore malformed messages */ }
          }}
        />
        )}
        {/* Submit Assignment footer — enabled once every question is answered */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(195,220,216,0.15)', backgroundColor: '#141414' }}>
          <Text style={{ flex: 1, color: '#BAA467', fontSize: 13 }}>
            {quizProgress ? `${quizProgress.attemptedCount}/${quizProgress.total} answered` : 'Answer every question to submit'}
          </Text>
          <TouchableOpacity
            testID="assignments-interactive-submit"
            disabled={!quizProgress?.completed || submittingQuiz}
            onPress={() => {
              if (!quizProgress?.completed) return;
              setSubmittingQuiz(true);
              fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${assignment.id}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  score: quizProgress.pct,
                  studentId: studentId,
                  answers: quizProgress.answers,
                  correct: quizProgress.correct,
                  total: quizProgress.total,
                }),
              })
                .then(r => r.json())
                .then(updated => {
                  onSubmitted(updated);
                  setSubmittingQuiz(false);
                  setQuizProgress(null);
                  onClose();
                })
                .catch(() => setSubmittingQuiz(false));
            }}
            style={{
              paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
              backgroundColor: quizProgress?.completed ? '#BAA467' : '#2A2A2A',
              opacity: submittingQuiz ? 0.6 : 1,
            }}
          >
            <Text style={{ color: quizProgress?.completed ? '#0F0F0F' : '#6E736B', fontSize: 14, fontWeight: '700' }}>
              {submittingQuiz ? 'Submitting…' : 'Submit Assignment'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
