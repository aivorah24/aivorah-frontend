import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../theme';
import { useCurriculumUpload } from './hooks/useCurriculumUpload';
import { useLearningPathDraft } from './hooks/useLearningPathDraft';
import LearningPathEditor from './components/LearningPathEditor';
import { CurriculumStatus } from './types';

const STATUS_LABEL: Record<CurriculumStatus, string> = {
  uploaded: 'Uploaded',
  processing: 'Processing document…',
  processed: 'Document processed',
  generating: 'Generating learning path…',
  generated: 'Learning path ready',
  failed: 'Failed',
};

export default function TeacherCurriculumLearningPathScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { curriculum, error: uploadError, busy, pickAndUpload, reset } = useCurriculumUpload();
  const curriculumId = curriculum?.status === 'generated' ? curriculum.id : null;
  const draft = useLearningPathDraft(curriculumId);

  useEffect(() => {
    if (curriculumId) draft.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  const isPublished = draft.learningPath?.status === 'published';
  const canPublish = !!draft.learningPath && draft.learningPath.status === 'draft' && !draft.saving && !draft.publishing;

  return (
    <ScreenLayout>
      <Header title="Curriculum & Syllabus" subtitle="AI-generated learning paths from your uploaded curriculum" />
      <ScrollView contentContainerStyle={styles.container}>
        {!curriculum && (
          <TouchableOpacity testID="upload-curriculum-button" style={styles.uploadButton} onPress={pickAndUpload} disabled={busy}>
            <Text style={styles.uploadButtonText}>Upload Curriculum (PDF, DOCX, XLSX)</Text>
          </TouchableOpacity>
        )}

        {curriculum && (
          <View testID="curriculum-status" style={styles.statusBlock}>
            <Text style={styles.statusText}>{STATUS_LABEL[curriculum.status]}</Text>
            {busy && curriculum.status !== 'failed' && <ActivityIndicator color={colors.primary} />}
            {curriculum.status === 'failed' && (
              <>
                <Text testID="upload-error" style={styles.errorText}>{curriculum.error || uploadError}</Text>
                <TouchableOpacity testID="retry-upload-button" onPress={() => { reset(); pickAndUpload(); }}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

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
            {!isPublished && (
              <View style={styles.actionsRow}>
                <TouchableOpacity testID="save-draft-button" onPress={draft.save} disabled={draft.saving}>
                  <Text style={styles.actionText}>{draft.saving ? 'Saving…' : 'Save changes'}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="publish-button" onPress={draft.publish} disabled={!canPublish}>
                  <Text style={styles.actionText}>{draft.publishing ? 'Publishing…' : 'Publish'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { padding: 16 },
  uploadButton: { padding: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
  uploadButtonText: { color: '#fff', fontWeight: '600' },
  statusBlock: { marginVertical: 12, alignItems: 'flex-start', gap: 6 },
  statusText: { fontSize: 15, fontWeight: '500', color: colors.textMain },
  errorText: { color: colors.accentRed },
  retryText: { color: colors.primary },
  publishedBanner: { color: colors.accentGreen, fontWeight: '700', marginBottom: 8 },
  metadataBlock: { marginBottom: 12, gap: 2 },
  metadataText: { fontSize: 12, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  actionText: { color: colors.primary, fontWeight: '600' },
});
