import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import type { AppColors } from '../../../../theme';
import { SUBJECT_COLORS } from '../constants';
import SERVER_URL from '../../../../config/serverUrl';

// Quiz Library's single-quiz preview — extracted verbatim (no behavior
// change) from TeacherAssignmentsScreen.tsx, tenth step of its
// hooks/components decomposition (2026-08-25).
export function QuizLibraryPreviewModal({ quiz, loading, colors, gold, styles, onClose, onAssign }: {
  quiz: any;
  loading: boolean;
  colors: AppColors;
  gold: string;
  styles: any;
  onClose: () => void;
  onAssign: (quiz: any) => void;
}) {
  const q = quiz;
  const subjectColor = SUBJECT_COLORS[q.subject] || gold;
  const tasks: any[] = q.quiz_data?.tasks || [];
  const allQuestions: any[] = tasks.flatMap((t: any) => t.questions || []);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { flex: 1, maxHeight: '95%', borderRadius: 20 }]}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 12 }}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>{q.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{q.subject} · {q.grade}{allQuestions.length > 0 ? ` · ${allQuestions.length} questions` : ''}</Text>
            </View>
            <TouchableOpacity
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: subjectColor }}
              activeOpacity={0.8}
              onPress={() => onAssign(q)}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Assign</Text>
            </TouchableOpacity>
          </View>
          {/* Real interactive quiz — same rendered HTML the student sees,
              not a reconstructed plain-text summary. */}
          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 40 }} />
          ) : allQuestions.length === 0 ? (
            <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 32 }}>No questions found in this quiz.</Text>
          ) : Platform.OS === 'web' ? (
            <View
              style={{ flex: 1 } as any}
              ref={(el: any) => {
                if (el && !(el as any)._done) {
                  (el as any)._done = true;
                  const f = document.createElement('iframe');
                  f.src = `${SERVER_URL}/quiz/${q.id}/html`;
                  f.style.cssText = 'width:100%;height:100%;border:none;display:block;';
                  f.title = 'Quiz Preview';
                  el.appendChild(f);
                }
              }}
            />
          ) : (
            <WebView
              source={{ uri: `${SERVER_URL}/quiz/${q.id}/html` }}
              style={{ flex: 1 }}
              originWhitelist={['*']}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
