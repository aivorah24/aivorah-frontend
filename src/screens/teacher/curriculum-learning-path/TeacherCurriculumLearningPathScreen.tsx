import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../theme';
import { useCurriculumUpload } from './hooks/useCurriculumUpload';
import { useLearningPathDraft } from './hooks/useLearningPathDraft';
import LearningPathEditor from './components/LearningPathEditor';
import PreUploadConfigPanel, { CURRICULA, GRADES_BY_CURRICULUM, ACADEMIC_YEARS } from './components/PreUploadConfigPanel';

export default function TeacherCurriculumLearningPathScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { curriculum, error: uploadError, busy, pickAndUpload, reset } = useCurriculumUpload();
  const curriculumId = curriculum?.status === 'generated' ? curriculum.id : null;
  const draft = useLearningPathDraft(curriculumId);

  const [configCurriculum, setConfigCurriculum] = useState(CURRICULA[3]); // CBSE
  const [configGrade, setConfigGrade] = useState(GRADES_BY_CURRICULUM.CBSE[5]); // Grade 6
  const [configSubject, setConfigSubject] = useState('Mathematics');
  const [configAcademicYear, setConfigAcademicYear] = useState(ACADEMIC_YEARS[2]); // 2026-27

  useEffect(() => {
    if (curriculumId) draft.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  const isPublished = draft.learningPath?.status === 'published';
  const canPublish = !!draft.learningPath && draft.learningPath.status === 'draft' && !draft.saving && !draft.publishing;
  const canSaveDraft = !!draft.learningPath && !isPublished && !draft.saving && !draft.publishing;

  const detected = draft.learningPath
    ? {
        unitCount: draft.learningPath.content.units.length,
        topicCount: draft.learningPath.content.units.reduce((sum, u) => sum + u.topics.length, 0),
      }
    : null;

  function handlePickFile() {
    if (curriculum) reset();
    pickAndUpload({ curriculum: configCurriculum, grade: configGrade, subject: configSubject });
  }

  // Guards against publishing a learning path that still has topics an AI
  // couldn't ground in real content (see aiGeneration.js's gap-resolution
  // protocol) — those need a teacher's input, not a silent publish of
  // generic/incomplete material to students.
  function handlePublish() {
    const units = draft.learningPath?.content.units || [];
    const unresolvedCount = units.reduce(
      (count, u) => count + u.topics.filter((t) => t.status === 'needs_teacher_input').length,
      0
    );
    if (unresolvedCount > 0) {
      Alert.alert(
        'Cannot publish yet',
        `Please review and provide input for ${unresolvedCount} topic${unresolvedCount === 1 ? '' : 's'} marked "Needs Your Input".`
      );
      return;
    }
    draft.publish();
  }

  return (
    <ScreenLayout>
      <Header title="Curriculum & Syllabus" subtitle="AI-generated learning paths from your uploaded curriculum" />
      <ScrollView contentContainerStyle={styles.container}>
        <PreUploadConfigPanel
          curriculum={configCurriculum} setCurriculum={setConfigCurriculum}
          grade={configGrade} setGrade={setConfigGrade}
          subject={configSubject} setSubject={setConfigSubject}
          academicYear={configAcademicYear} setAcademicYear={setConfigAcademicYear}
          fileName={curriculum?.file_name ?? null}
          status={curriculum?.status ?? null}
          statusError={curriculum?.status === 'failed' ? (curriculum.error || uploadError) : null}
          busy={busy}
          onPickFile={handlePickFile}
          detected={detected}
          onSaveDraft={draft.save}
          onPublish={handlePublish}
          canSaveDraft={canSaveDraft}
          canPublish={canPublish}
          saving={draft.saving}
          publishing={draft.publishing}
        />

        {uploadError && curriculum?.status !== 'failed' && (
          <Text testID="general-error" style={styles.errorText}>{uploadError}</Text>
        )}

        {draft.loading && <ActivityIndicator testID="draft-loading" color={colors.primary} />}
        {draft.error && <Text testID="draft-error" style={styles.errorText}>{draft.error}</Text>}

        {draft.learningPath && (
          <View testID="learning-path-review">
            {isPublished && <Text testID="published-banner" style={styles.publishedBanner}>Published</Text>}
            <View testID="curriculum-metadata" style={styles.metadataBlock}>
              {curriculum?.file_name && <Text style={styles.metadataText}>File: {curriculum.file_name}</Text>}
              {draft.learningPath.content.metadata?.curriculum && (
                <Text style={styles.metadataText}>Curriculum: {draft.learningPath.content.metadata.curriculum}</Text>
              )}
              {draft.learningPath.content.metadata?.grade && (
                <Text style={styles.metadataText}>Grade: {draft.learningPath.content.metadata.grade}</Text>
              )}
              {draft.learningPath.content.metadata?.subject && (
                <Text style={styles.metadataText}>Subject: {draft.learningPath.content.metadata.subject}</Text>
              )}
              <Text style={styles.metadataText}>Learning Path ID: {draft.learningPath.id}</Text>
            </View>
            <LearningPathEditor
              content={draft.learningPath.content}
              onChange={draft.updateContent}
              readOnly={isPublished}
            />
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { padding: 16, gap: 16 },
  errorText: { color: colors.accentRed },
  publishedBanner: { color: colors.accentGreen, fontWeight: '700', marginBottom: 8 },
  metadataBlock: { marginBottom: 12, gap: 2 },
  metadataText: { fontSize: 12, color: colors.textMuted },
});
