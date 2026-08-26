import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ScrollView } from 'react-native';

// The Worksheet Upload wizard's fixed-at-bottom Back/Next/Publish footer —
// lives outside the modal's ScrollView, so it's a sibling of
// WorksheetUploadFlow rather than part of it — extracted verbatim (no
// behavior change) from TeacherAssignmentsScreen.tsx, as part of splitting
// the Create Assignment Modal wizard into per-flow components
// (2026-08-25), following the design the user specified.
export function UploadWizardFooter({
  uploadStep, setUploadStep, setFormError, uploadScrollRef,
  docFiles, uploadingDoc, extractingQuestions, interactiveQuiz,
  title, dueDate, creating, createAssignment,
  colors, styles,
}: {
  uploadStep: 1 | 2 | 3;
  setUploadStep: (s: 1 | 2 | 3) => void;
  setFormError: (v: string) => void;
  uploadScrollRef: React.RefObject<ScrollView | null>;
  docFiles: any[];
  uploadingDoc: boolean;
  extractingQuestions: boolean;
  interactiveQuiz: any;
  title: string;
  dueDate: string;
  creating: boolean;
  createAssignment: () => void;
  colors: AppColors;
  styles: any;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
      {uploadStep > 1 && (
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderColor }}
          onPress={() => {
            setUploadStep((uploadStep - 1) as 1 | 2 | 3);
            setFormError('');
            uploadScrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={14} color={colors.textMuted} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>Back</Text>
        </TouchableOpacity>
      )}
      {uploadStep < 3 ? (
        <TouchableOpacity
          style={[styles.submitBtn, { flex: 2, marginTop: 0, opacity: (uploadStep === 1 && (docFiles.length === 0 || uploadingDoc || extractingQuestions)) || (uploadStep === 2 && !interactiveQuiz) ? 0.5 : 1 }]}
          onPress={() => {
            if (uploadStep === 1 && docFiles.length === 0) { setFormError('Upload at least one worksheet page'); return; }
            if (uploadStep === 1 && (uploadingDoc || extractingQuestions)) return;
            if (uploadStep === 2 && !interactiveQuiz) return;
            setFormError('');
            setUploadStep((uploadStep + 1) as 1 | 2 | 3);
            uploadScrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>Next</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.submitBtn, { flex: 2, marginTop: 0, backgroundColor: creating ? colors.borderColor : colors.accentGreen }]}
          onPress={() => {
            if (!title.trim()) { setFormError('Title is required'); return; }
            if (!dueDate.trim()) { setFormError('Due date is required'); return; }
            setFormError('');
            createAssignment();
          }}
          activeOpacity={0.85}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={15} color="#fff" />
          )}
          <Text style={styles.submitBtnText}>
            {creating ? 'Publishing...' : 'Publish Assignment'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
