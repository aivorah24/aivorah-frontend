import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import { useTheme } from '../../../context/ThemeContext';
import type { AppColors } from '../../../theme';
import { useCurriculumUpload } from './hooks/useCurriculumUpload';
import { useLearningPathDraft } from './hooks/useLearningPathDraft';
import LearningPathEditor from './components/LearningPathEditor';
import MyLearningPathsList from './components/MyLearningPathsList';
import PreUploadConfigPanel, { CURRICULA, GRADES_BY_CURRICULUM, ACADEMIC_YEARS } from './components/PreUploadConfigPanel';

export default function TeacherCurriculumLearningPathScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { curriculum, progress, fileName, phase, error: uploadError, busy, connectionIssue, pickAndUpload, retry } = useCurriculumUpload();
  const uploadedId = curriculum?.status === 'generated' ? curriculum.id : null;
  // A path reopened from "My Learning Paths"; a newly finished upload takes over again.
  const [openedId, setOpenedId] = useState<string | null>(null);
  const curriculumId = openedId ?? uploadedId;
  const draft = useLearningPathDraft(curriculumId);
  const [listRefresh, setListRefresh] = useState(0);
  const refreshList = () => setListRefresh((n) => n + 1);

  useEffect(() => {
    if (uploadedId) { setOpenedId(null); refreshList(); }
  }, [uploadedId]);

  // Web: warn before leaving the page with edits that are not saved yet.
  useEffect(() => {
    if (Platform.OS !== 'web' || !draft.dirty || typeof window === 'undefined') return undefined;
    const warn = (e: any) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft.dirty]);

  const [configCurriculum, setConfigCurriculum] = useState(CURRICULA[3]); // CBSE
  const [configGrade, setConfigGrade] = useState(GRADES_BY_CURRICULUM.CBSE[5]); // Grade 6
  const [configSubject, setConfigSubject] = useState('Mathematics');
  const [configAcademicYear, setConfigAcademicYear] = useState(ACADEMIC_YEARS[2]); // 2026-27

  useEffect(() => {
    if (curriculumId) draft.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumId]);

  const isPublished = draft.isPublished;
  const busyWriting = draft.saving || draft.publishing;
  const canPublish = !!draft.learningPath && !busyWriting && (!isPublished || draft.hasUnpublishedChanges);
  const canSaveDraft = !!draft.learningPath && !busyWriting && draft.dirty;
  const savedAt = draft.learningPath?.updated_at
    ? new Date(draft.learningPath.updated_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null;
  const saveNote = draft.dirty ? 'You have unsaved changes' : savedAt ? `All changes saved · ${savedAt}` : undefined;
  const publishLabel = isPublished ? (draft.hasUnpublishedChanges ? 'Publish updates' : 'Published — no new changes') : 'Publish to students';

  async function handleSave() {
    if (await draft.save()) refreshList();
  }

  function setTitle(title: string) {
    if (!draft.learningPath) return;
    const content = draft.learningPath.content;
    draft.updateContent({ ...content, metadata: { ...(content.metadata || {}), title } });
  }

  const detected = draft.learningPath
    ? {
        unitCount: draft.learningPath.content.units.length,
        topicCount: draft.learningPath.content.units.reduce((sum, u) => sum + u.topics.length, 0),
      }
    : null;

  function handlePickFile() {
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
    draft.publish().then((ok) => { if (ok) refreshList(); });
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
          fileName={fileName ?? curriculum?.file_name ?? null}
          status={curriculum?.status ?? null}
          phase={phase}
          progress={progress}
          connectionIssue={connectionIssue}
          onRetry={retry}
          statusError={curriculum?.status === 'failed' ? (curriculum.error || uploadError) : phase === 'upload_failed' ? uploadError : null}
          busy={busy}
          onPickFile={handlePickFile}
          detected={detected}
          onSaveDraft={handleSave}
          onPublish={handlePublish}
          canSaveDraft={canSaveDraft}
          canPublish={canPublish}
          saving={draft.saving}
          publishing={draft.publishing}
          publishLabel={publishLabel}
          saveNote={saveNote}
        />

        <MyLearningPathsList
          colors={colors}
          openCurriculumId={curriculumId}
          refreshKey={listRefresh}
          onOpen={(id) => {
            if (draft.dirty && !(typeof window !== 'undefined' && window.confirm?.('You have unsaved changes. Leave them?'))) return;
            setOpenedId(id);
          }}
          onDeleted={(id) => { if (id === curriculumId) setOpenedId(null); }}
        />

        {uploadError && curriculum?.status !== 'failed' && phase !== 'upload_failed' && (
          <Text testID="general-error" style={styles.errorText}>{uploadError}</Text>
        )}

        {draft.loading && <ActivityIndicator testID="draft-loading" color={colors.primary} />}
        {draft.error && <Text testID="draft-error" style={styles.errorText}>{draft.error}</Text>}

        {draft.learningPath && (
          <View testID="learning-path-review">
            <View testID="curriculum-metadata" style={styles.metadataBlock}>
              <Text style={styles.metadataLabel}>LEARNING PATH NAME (students see this)</Text>
              <TextInput
                testID="learning-path-title"
                value={draft.learningPath.content.metadata?.title ?? ''}
                onChangeText={setTitle}
                placeholder={[draft.learningPath.content.metadata?.grade && `Grade ${draft.learningPath.content.metadata.grade}`, draft.learningPath.content.metadata?.subject].filter(Boolean).join(' ') || 'Learning path name'}
                placeholderTextColor={colors.textMuted}
                style={styles.titleInput}
              />
              <Text testID="save-state" style={[styles.metadataText, draft.dirty && { color: colors.primary, fontWeight: '700' }]}>
                {isPublished ? (draft.hasUnpublishedChanges ? 'Published · your latest edits are not published yet' : 'Published · students see this version') : 'Draft · only you can see this'}
                {saveNote ? ` · ${saveNote}` : ''}
              </Text>
            </View>
            <LearningPathEditor
              content={draft.learningPath.content}
              onChange={draft.updateContent}
              onRebuildTopic={draft.rebuildTopic}
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
  metadataBlock: { marginBottom: 12, gap: 4 },
  metadataLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.textMuted },
  titleInput: { fontSize: 18, fontWeight: '800', color: colors.textMain, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  metadataText: { fontSize: 12, color: colors.textMuted },
});
