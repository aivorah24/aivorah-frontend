import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

// The "Reuse a saved quiz" picker (AI-mode quiz generator's shortcut into
// the Quiz Library) — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, fourteenth step of its hooks/components
// decomposition (2026-08-25).
export function ReuseQuizModal({
  visible, loading, quizzes, subject, colors, gold, onClose, setInteractiveQuiz,
}: {
  visible: boolean;
  loading: boolean;
  quizzes: any[];
  subject: string;
  colors: AppColors;
  gold: string;
  onClose: () => void;
  setInteractiveQuiz: (v: any) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.cardDark, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain }}>Saved Quizzes</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.accentYellow} />
              <Text style={{ color: colors.textDim, marginTop: 12, fontSize: 13 }}>Loading saved quizzes...</Text>
            </View>
          ) : quizzes.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Feather name="inbox" size={32} color={colors.textDim} />
              <Text style={{ color: colors.textDim, marginTop: 12, fontSize: 14, textAlign: 'center' }}>No saved quizzes yet{subject ? ` for ${subject}` : ''}.</Text>
              <Text style={{ color: colors.textDim, marginTop: 4, fontSize: 12, textAlign: 'center' }}>Generate and publish a quiz — it will appear here for reuse.</Text>
            </View>
          ) : (
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {quizzes.map((q: any) => (
                <TouchableOpacity
                  key={q.id}
                  style={{ padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderColor, backgroundColor: colors.bgDark, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  onPress={async () => {
                    const quizData = q.quiz_data || q;
                    const previewRes = await fetch(`${ASSIGNMENTS_SERVER_URL}/quiz/render-preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz: quizData }) });
                    const previewHtml = await previewRes.text();
                    setInteractiveQuiz({ ...quizData, _previewHTML: previewHtml });
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="file-text" size={20} color={gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>{q.title || 'Untitled Quiz'}</Text>
                    <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>{[q.subject, q.grade].filter(Boolean).join(' · ')}{q.created_at ? ` · ${new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={gold} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
